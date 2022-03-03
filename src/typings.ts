import { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import { ReactNode } from 'react';

interface INodeAction {
  key: string;
  label: string | ReactNode;
}

export interface IForceGraphHandler {
  update: (nodes: INode[], links: ILink[]) => void;
}

export interface IForceGraphProps extends IGraphData {
  /** svg 的宽度 */
  width: number;
  /** svg 的高度 */
  height: number;
  /** link 所表示的字段含义 */
  weightField: string;
  /** 主题 */
  theme?: 'light' | 'dark';
  /** 节点操作按钮 */
  nodeActions?: INodeAction[];
  /** 节点点击事件 */
  onNodeClick?: (action: INodeAction, node: INode) => void;
}

export interface IGraphData {
  nodes: INode[];
  links: ILink[];
}

/** 节点 */
export interface INode extends SimulationNodeDatum {
  id: string;
  [key: string]: any;
}

/** 边 */
export interface ILink extends SimulationLinkDatum<INode> {
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
export type D3Link =
  | d3.Selection<SVGLineElement, ILink, SVGGElement, unknown>
  | undefined;
