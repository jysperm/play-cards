# Play Cards
这是我对基于 LeanCloud 实现 **卡牌对战游戏** 的一个实践，目前实现了「斗地主」规则的一个子集，每局游戏有三个玩家参与，支持：单子、对子、三不带、三带一、三带二、炸弹、单顺、双顺；不支持：大小王、叫地主、抢地主、四带一、四带二、飞机。

目前有两种实现：

- `realtime` 分支：基于 LeanCloud [实时通信服务](https://leancloud.cn/docs/realtime_v2.html) 实现
- `play` 分支：基于 LeanCloud [游戏解决方案](https://leancloud.cn/docs/play.html) 实现

每种实现都同时支持「动作同步（帧同步）」和「状态同步（C/S 同步）」。

演示视频：<https://streamable.com/belpq>

## 项目结构

```
common              -- 公共模块（客户端、服务器共用）
├── game.ts           -- 游戏业务逻辑
└── types.ts
browser-clint       -- 客户端项目
├── app.tsx           -- 客户端入口、界面
└── client-sync.ts    -- 客户端同步逻辑
play-server         -- 服务器项目
├── server-sync.ts    -- 服务器同步逻辑
└── server.ts         -- 服务器入口、房间匹配
```
