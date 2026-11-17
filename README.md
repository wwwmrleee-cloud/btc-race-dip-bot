# btc-race-dip-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/wwwmrleee-cloud/btc-race-dip-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/wwwmrleee-cloud/btc-race-dip-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A one-trade BTC dip-buy bot: it waits for cbBTC to close 0.8% below its 240-minute average, buys all-in once, and holds to the end, with a 2.5% hard stop and late fallbacks so it always makes at least one trade. Dev window (grade-local, Node process driver, run twice): net PnL **+$10.35**, 1 trade, max drawdown 2.12% — above the $0 dev gate. Fast trend bots lost $10–$106 on the same window, so this bot deliberately trades once.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout (see `vendor/makefun-bars.ts`). It is graded with the kit's `grade-local` command.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wp8y7q6s&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
