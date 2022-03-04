# D3 实现 IP 访问关系图

## Installation

To use it on the web:

```
yarn add @anonymity94/d3-force-graph
```

```
npm install @anonymity94/d3-force-graph
```

## Quick start

```tsx
import ForceGraph, { defaultLightTheme } from '@anonymity94/d3-force-graph';

const Demo = () => {
  <ForceGraph
    theme={defaultLightTheme}
    weightField="value"
    width={1800}
    height={800}
    nodes={[{ id: 'node1' }, { id: 'node2' }]}
    links={[{ source: 'node1', target: 'node2', value: 100 }]}
    nodeActions={[
      { key: 'action1', label: '操作1' },
      { key: 'action2', label: '操作2' },
    ]}
    onNodeClick={(action, node) => {
      console.log(action);
      console.log(node);
    }}
  />;
};
```

## Dev

```bash
yarn

# demo dev
yarn run demo:dev
# 访问 http://localhost:1234

# 构建 demo
yarn run demo:prod
```
