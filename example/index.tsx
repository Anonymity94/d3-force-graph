import React, { useRef } from "react";
import ReactDOM from "react-dom";
import { IForceGraphHandler } from "../src/typings";
import ForceGraph from "../src/index";
import { faker } from "@faker-js/faker";
import graphData from "./data5.json";

/** 节点操作菜单 */
enum ENodeOperateMenuKey {
  /** IP下钻 */
  IP_DILLDOWN = "ip-dilldown",
  /** 添加IP过滤 */
  IP_FILTER = "ip-filter",
  /** 跳转到会话详单 */
  FLOW_RECORD = "flow-record",
  /** 跳转到流量分析 */
  FLOW_LOCATION = "flow/location",
  /** 跳转到数据包 */
  PACKET = "packet",
}

// 组装数据
const nodes = [];
const links = [];
// 节点的数据统计集合
const nodeSummary: Record<
  string,
  {
    totalBytes: number;
    establishedSessions: number;
  }
> = {};

graphData.forEach((row) => {
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

console.log(nodeSummary["192.168.15.96"]);
console.log(nodeSummary["42.81.176.204"]);

const Demo = () => {
  const graphRef = useRef<IForceGraphHandler>();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          const mockIp = faker.internet.ip();
          graphRef?.current.update(
            [
              {
                id: mockIp,
                establishedSessions: 10000,
                totalBytes: 12000,
              },
            ],
            [
              {
                source: mockIp,
                target: "10.0.0.110",
                establishedSessions: 42,
                totalBytes: 332302649,
              },
            ]
          );
        }}
      >
        新增节点
      </button>
      <ForceGraph
        ref={graphRef}
        weightField="totalBytes"
        width={1800}
        height={800}
        nodes={nodes.map((n) => ({ ...n, ...(nodeSummary[n.id] || {}) }))}
        links={links}
        nodeActions={[
          { key: ENodeOperateMenuKey.IP_DILLDOWN, label: "IP下钻" },
          { key: ENodeOperateMenuKey.IP_FILTER, label: "添加IP过滤" },
          { key: ENodeOperateMenuKey.FLOW_RECORD, label: "会话详单" },
          { key: ENodeOperateMenuKey.FLOW_LOCATION, label: "流量分析" },
          { key: ENodeOperateMenuKey.PACKET, label: "数据包" },
        ]}
        onNodeClick={(action, node) => {
          console.log(action);
          console.log(node);
        }}
      />
    </>
  );
};

const rootNode = document.querySelector("#root");

rootNode && ReactDOM.render(<Demo />, rootNode);
