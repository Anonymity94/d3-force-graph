import { SimulationLinkDatum, SimulationNodeDatum } from "d3";
import { ReactNode } from "react";

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
