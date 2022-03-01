import { SimulationLinkDatum, SimulationNodeDatum } from "d3";

export interface IForceGraphProps extends IGraphData {
  /** svg 的宽度 */
  width: number;
  /** svg 的高度 */
  height: number;
  /** link 所表示的字段含义 */
  weightField: string;
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
  source: string;
  target: string;
  [key: string]: any;
}
