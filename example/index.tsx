import React from "react";
import ReactDOM from "react-dom";

import ForceGraph from "../src/index";
import graphData from "./data1000.json";

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
    });
  }
});

console.log(nodeSummary["192.168.15.96"]);
console.log(nodeSummary["42.81.176.204"]);

const Demo = () => {
  return (
    <ForceGraph
      weightField="totalBytes"
      width={1800}
      height={800}
      nodes={nodes.map((n) => ({ ...n, ...(nodeSummary[n.id] || {}) }))}
      links={links}
    ></ForceGraph>
  );
};

const rootNode = document.querySelector("#root");

rootNode && ReactDOM.render(<Demo />, rootNode);
