import { faker } from '@faker-js/faker';
import { useState } from 'react';
import { render } from 'react-dom';
import ForceGraph from '../../src';
import { IEdge, INode, ITheme } from '../../src/typings';
import { defaultDarkTheme, defaultLightTheme } from '../../src/utils/theme';
import graphData from '../mock/data100.json';

/** 节点操作菜单 */
enum ENodeOperateMenuKey {
  /** IP下钻 */
  IP_DILLDOWN = 'ip-dilldown',
  /** 添加IP过滤 */
  IP_FILTER = 'ip-filter',
  /** 跳转到会话详单 */
  FLOW_RECORD = 'flow-record',
  /** 跳转到流量分析 */
  FLOW_LOCATION = 'flow/location',
  /** 跳转到数据包 */
  PACKET = 'packet',
}

// 组装数据
const nodes: INode[] = [];
const links: IEdge[] = [];
// 节点的数据统计集合
const nodeSummary: Record<
  string,
  {
    totalBytes: number;
    establishedSessions: number;
  }
> = {};

graphData.forEach((row: any) => {
  const { ipAAddress, ipBAddress } = row;

  // 统计节点的数据情况
  nodeSummary[ipAAddress] = {
    totalBytes: (nodeSummary[ipAAddress]?.totalBytes || 0) + row.totalBytes,
    establishedSessions:
      (nodeSummary[ipAAddress]?.establishedSessions || 0) +
      row.establishedSessions,
  };
  nodeSummary[ipBAddress] = {
    totalBytes: (nodeSummary[ipBAddress]?.totalBytes || 0) + row.totalBytes,
    establishedSessions:
      (nodeSummary[ipBAddress]?.establishedSessions || 0) +
      row.establishedSessions,
  };

  if (!nodes.find((n) => n.id === ipAAddress)) {
    // 统计节点所有的流量
    nodes.push({
      id: ipAAddress,
    });
  }
  if (!nodes.find((n) => n.id === ipBAddress)) {
    nodes.push({
      id: ipBAddress,
    });
  }
  if (
    !links.find((l) => l.source === ipAAddress && l.target === ipBAddress) &&
    !links.find((l) => l.source === ipBAddress && l.target === ipAAddress)
  ) {
    links.push({
      source: ipAAddress,
      target: ipBAddress,
      totalBytes: row.totalBytes,
      establishedSessions: row.establishedSessions,
    });
  }
});

const Demo = () => {
  const [theme, setTheme] = useState<ITheme>(defaultLightTheme);
  const [height, setHeight] = useState<number>(500);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTheme((prev) => {
            return prev.mode === 'light' ? defaultDarkTheme : defaultLightTheme;
          });
        }}
      >
        切换主题
      </button>
      <button
        type="button"
        onClick={() => {
          setHeight(
            faker.datatype.number({ min: 500, max: 1000, precision: 10 }),
          );
        }}
      >
        调整高度
      </button>
      <ForceGraph
        theme={theme}
        weightField="totalBytes"
        height={height}
        nodes={nodes.map((n) => ({ ...n, ...(nodeSummary[n.id] || {}) }))}
        edges={links}
        nodeActions={[
          { key: ENodeOperateMenuKey.IP_DILLDOWN, label: 'IP下钻' },
          { key: ENodeOperateMenuKey.IP_FILTER, label: '添加IP过滤' },
          { key: ENodeOperateMenuKey.FLOW_RECORD, label: '会话详单' },
          { key: ENodeOperateMenuKey.FLOW_LOCATION, label: '流量分析' },
          { key: ENodeOperateMenuKey.PACKET, label: '数据包' },
        ]}
        onNodeClick={(action, node) => {
          console.log(action);
          console.log(node);
        }}
        edgeActions={[
          { key: ENodeOperateMenuKey.IP_DILLDOWN, label: 'IP下钻111' },
          { key: ENodeOperateMenuKey.IP_FILTER, label: '添加IP过滤111' },
          { key: ENodeOperateMenuKey.FLOW_RECORD, label: '会话详单111' },
          { key: ENodeOperateMenuKey.FLOW_LOCATION, label: '流量分析111' },
          { key: ENodeOperateMenuKey.PACKET, label: '数据包11' },
        ]}
        onEdgeClick={(action, edge) => {
          console.log(action);
          console.log(edge);
        }}
      />
    </>
  );
};

const rootNode = document.querySelector('#root');

rootNode && render(<Demo />, rootNode);
