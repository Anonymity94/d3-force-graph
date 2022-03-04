import { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import { ReactNode } from 'react';

interface IAction {
  key: string;
  label: string | ReactNode;
}

export interface ITheme {
  /** 模式 light | dark */
  mode: 'light' | 'dark';
  /** 画布背景 */
  backgroundColor: string;
  /** 节点颜色 */
  nodeColor: string;
  /** 节点标签颜色 */
  nodeLabelColor: string;
  /** 边的颜色 */
  edgeColor: string;
}

export interface IForceGraphHandler {
  update: (nodes: INode[], edges: IEdge[]) => void;
}

export interface IForceGraphProps extends IGraphData {
  /** svg 的宽度 */
  width?: number;
  /** svg 的高度 */
  height?: number;
  /** link 所表示的字段含义 */
  weightField: string;
  /** 主题 */
  theme?: ITheme;
  /** 节点操作按钮 */
  nodeActions?: IAction[];
  /** 节点点击事件 */
  onNodeClick?: (action: IAction, node: INode) => void;
  /** 节点操作按钮 */
  edgeActions?: IAction[];
  /** 节点点击事件 */
  onEdgeClick?: (action: IAction, edge: IEdge) => void;
}

export interface IGraphData {
  nodes: INode[];
  edges: IEdge[];
}

/** 节点 */
export interface INode extends SimulationNodeDatum {
  id: string;
  [key: string]: any;
}

/** 边 */
export interface IEdge extends SimulationLinkDatum<INode> {
  [key: string]: any;
}

// D3 内的类型
// ===============
/** D3 simulation */
export type D3Simulation = Simulation<INode, undefined>;
/** D3 Node */
export type D3Node =
  | d3.Selection<SVGCircleElement, INode, SVGGElement, unknown>
  | undefined;
/** D3 link */
export type D3Edge =
  | d3.Selection<SVGLineElement, IEdge, SVGGElement, unknown>
  | undefined;
