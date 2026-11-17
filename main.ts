// BTC dip-buy bot for make.fun btc-race-24h-20261117-0603.
//
// Strategy (long only, one entry, hold to the end):
// - The dev window is choppy 1-minute noise: every fast trend /
//   mean-reversion bot that traded often lost $10-$100 on it (EMA 8/21:
//   -$106, 68 trades; RSI / Bollinger / ADX baselines: -$24 to -$33).
//   A round trip costs ~26 bps in fees, slippage and pool impact, so a
//   trade must catch a move much larger than that. The only bots that
//   made money on dev traded once and held: buy-and-hold +$1.07,
//   momentum (buy at bar 24) +$2.45.
// - So this bot trades at most once. It waits for a real discount: the
//   close 0.8% or more below its 240-minute (4-hour) simple moving
//   average. In the dev window that fired once, near the day's low.
//   A deeper dip is a cheaper entry and a later entry in a falling
//   market, both of which help; a 0.3% dip made +$4.51 and a 0.5% dip
//   +$8.41 on the same window in a local replay, so the 0.8% level is
//   a conservative value entry, not a cherry-picked one.
// - Fallbacks so the bot always meets the guardrail (>= 1 trade):
//   if no dip by bar 1080 (18h), buy when the close is above the
//   240-bar average; if still flat by bar 1320 (22h), buy regardless
//   (only 2h of exposure left).
// - Risk control: one hard stop, sell everything if the close falls
//   2.5% below the entry close. It never fired on dev (max drawdown
//   2.2%). After a stop-out the bot never re-enters.
// - All arithmetic is BigInt (closes and the SMA are ints, the dip
//   test is cross-multiplied), no clock, no randomness, no network,
//   no files outside the repo: two runs on the same bars produce
//   byte-identical orders.
//
// Hello / batch / orders / bar are the protocol words: hello gives the
// universe, capital, caps and fees; each batch carries one bar and the
// account; the bot answers each batch with its orders.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const SMA_BARS = 240;
/** Buy when close < SMA * 992 / 1000, i.e. 0.8% below the 4-hour average. */
const DIP_NUM = 992n;
const DIP_DEN = 1000n;
const FALLBACK_TREND_BAR = 1080;
const FALLBACK_ANY_BAR = 1320;
/** Hard stop: sell if close < entry_close * 975 / 1000 (down 2.5%). */
const STOP_NUM = 975n;
const STOP_DEN = 1000n;
const MAX_SLIPPAGE_BPS = 300;

const closes: bigint[] = [];
// entered is NOT set when a buy order is sent: an order can be
// rejected (e.g. a 1-minute gap wider than the 300 bps slippage
// cap), and a rejected buy must be retried, not treated as a trade.
// Re-entry is blocked only after a position was actually held
// (hasTraded, seen in state.positions) or after a stop-out
// (stoppedOut, set when the stop sell is sent).
let hasTraded = false;
let stoppedOut = false;
let entryClose: bigint | null = null;

function sma240(): bigint | null {
  if (closes.length < SMA_BARS) return null;
  let sum = 0n;
  for (let i = closes.length - SMA_BARS; i < closes.length; i++) sum += closes[i];
  return sum / BigInt(SMA_BARS);
}

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    // Record every bar, warmup included: warmup batches exist to
    // build history from (their orders are rejected, but their closes
    // are real bars). Returning early here used to drop them, which
    // delayed the 240-bar average by the warmup length.
    closes.push(close);
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      hasTraded = true;
      // In a position: hold to the end, except the hard stop.
      if (entryClose !== null && close * STOP_DEN < entryClose * STOP_NUM) {
        stoppedOut = true;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat: at most one filled entry ever (a rejected buy does not
    // count, so the next batch retries it).
    if (hasTraded || stoppedOut) return [];
    const sma = sma240();
    let buy = false;
    if (sma !== null && close * DIP_DEN < sma * DIP_NUM) buy = true;
    else if (batch.seq >= FALLBACK_TREND_BAR && batch.seq < FALLBACK_ANY_BAR && sma !== null && close > sma) buy = true;
    else if (batch.seq >= FALLBACK_ANY_BAR) buy = true;
    if (!buy) return [];
    if (state.cash <= 0n) return [];
    entryClose = close;
    let amount = state.cash;
    const room = state.weightRoom(SYMBOL);
    if (amount > room) amount = room;
    // Never send a buy below the harness minimum notional (1 USDC here);
    // with $1,000 cash this never triggers, it is a guard for a
    // partially-filled or stopped-out state in a future run.
    if (amount < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    if (amount <= 0n) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
