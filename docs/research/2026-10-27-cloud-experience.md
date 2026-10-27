# GitHub 参考与实施取舍

本轮从官方仓库读取源码和文档后借鉴交互，没有复制第三方源码、图标或品牌资产。三项目未归档，调研时默认分支头提交均为2026-10-26。

1. AFFiNE：分组导航、可折叠分区、集中设置与云状态。根许可证为混合授权，前端等MIT、后端和native为EE，不把整仓当作MIT采用。
源码：https://github.com/toeverything/AFFiNE/blob/5f1925499760f6954c1e656711d9fb6ed3168179/packages/frontend/core/src/components/root-app-sidebar/index.tsx#L194-L254
许可：https://github.com/toeverything/AFFiNE/blob/canary/LICENSE
设置文档：https://docs.affine.pro/core-concepts/elements-of-affine/settings

2. Plane：保存视图保留筛选与展示方式，任务本身不复制；恢复视图仍复用当前数据。AGPL-3.0，本轮不复制实现。
源码：https://github.com/makeplane/plane/blob/a9e70360c5bc5b1beb5f70fe4c2fa765743147ec/apps/web/components/issues/issue-layouts/roots/project-view-layout-root.tsx#L55-L99
文档：https://docs.plane.so/core-concepts/views
许可：https://github.com/makeplane/plane/blob/preview/LICENSE.txt

3. Super Productivity：连接表单先校验再保存启用，启用、最近刷新与真实同步成功分开表达。MIT，本轮复用NEXUS已有SDK和组件实现相同产品原则。
源码：https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/imex/sync/dialog-sync-cfg/dialog-sync-cfg.component.html#L17-L35
状态：https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/sync/super-sync-status.service.ts#L6-L42
许可：https://github.com/super-productivity/super-productivity/blob/master/LICENSE

云端实现以Supabase官方API Keys、Realtime subscribe与Auth文档为准：https://supabase.com/docs/guides/getting-started/api-keys 、https://supabase.com/docs/reference/javascript/subscribe 。浏览器只接受公开Publishable key或合法旧anon，拒绝Secret/service_role。

设计重点：手机首条任务此前位于约555/812px，缩短筛选区；19项扁平导航改为分组；低对比辅助字提升；修复同ID实时刷新覆盖未保存任务草稿。

## 已实施与验收

- 20个路由保留，工作区按行动/记录/生活/展示分组，设置与回收站固定底部；分组与侧栏宽度持久保存，原数字快捷键不变。
- 任务渐进筛选、条件chips、命名视图、移动metadata与更多菜单。同ID刷新不重置草稿，远端删除保留当前草稿供复制，切换账号清理旧窗口。
- 应用内云端向导：复制/下载SQL、公开key校验、只读探测、保存重载、登录与逐表检查；外观/备份统一入口。
- 11业务模块的实时订阅、受控刷新、离线与错误状态、账号切换清理、慢请求保护及新增去重。硬删除在返回页面或手动刷新时核对，无后台全量轮询。
- 17个测试文件、264项回归通过；TypeScript与生产构建通过。保留原有advancedChunks弃用与Three.js大分包提示，无新增运行时依赖。
- 独立Chrome：开发与生产路由、保存视图增改删/恢复、导航分组与宽度、任务草稿冲突与删除、深浅主题、375px无横向溢出。原手机截图首条任务约555px，本轮375×812生产版实测371px。
- 只读连接、注册确认提示、登录、11表读取与诊断、离线、切回本地保留数据通过模拟Auth/REST服务验收，没有真实账号、邮件或数据库写入。
- 会话存储受限的无PIN测试配置仍能打开向导；这不代表完全禁用localStorage/IndexedDB时全部功能可用。

## 当前数据边界

用户明确暂无Supabase项目，本轮未创建项目、未执行真实SQL。真实登录、跨设备通知与数据库RLS写入隔离仍需项目创建后验证。客户端只读探测和表检查不等于完整权限验收。

连接信息保存在当前浏览器，换设备填写同一项目后登录相同账号。11业务集合写云端；专注历史、手写工作日志、个人档案、外观和保存视图仍为本机内容，其中白名单可由v10 JSON备份迁移。保存视图不在当前备份白名单中。
