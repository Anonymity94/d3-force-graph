import * as d3 from 'd3';
import { ZoomTransform } from 'd3';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AnyWhereContainer, {
  IAnyWhereContainerRefReturn,
} from './components/AnyWhereContainer';
import GraphControl, { IControlAction } from './components/Control';
import type {
  D3Edge,
  D3Node,
  D3Simulation,
  IEdge,
  IForceGraphProps,
  INode,
} from './typings';
import { exportPng, formatBytes, formatNumber } from './utils';
import { defaultDarkTheme, defaultLightTheme } from './utils/theme';

// svg 画布
let svg: d3.Selection<any, unknown, any, any> | undefined;
// 容器
let container: d3.Selection<any, unknown, any, any> | undefined;
// 力导向图实例
let simulation: D3Simulation;
let d3Zoom: d3.ZoomBehavior<Element, unknown>;
// d3中所有的 node 节点
let d3Node: D3Node;
// d3中所有的边
let d3Edge: D3Edge;
// d3中所有的节点标签
let d3NodeLabel: any;
// 当前正在被拖拽的节点
let draggingNode: any;

/**
 * D3 zoom 放缩结果
 * @see https://www.d3js.org.cn/document/d3-zoom/
 */
let zoomTransform: ZoomTransform = d3.zoomIdentity;

const maxLog = Math.ceil(Math.pow(Math.E, 9));

const idRegex = /[\[\]:. ]/g;

/** 解锁所有的节点 */
const unLockAllNode = () => {
  container?.selectAll('.node').each((d: any) => {
    d.fx = undefined;
    d.fy = undefined;
  });
  simulation?.alphaTarget(0.3).restart();
};

/** 固定所有的节点 */
const lockAllNode = () => {
  container?.selectAll('.node').each((d: any) => {
    d.fx = d.x;
    d.fy = d.y;
  });
  // simulation!.alphaTarget(0.3).restart();
};

/** 节点拖拽 */
const handleDrag = (forceSimulation?: D3Simulation) => {
  function dragstarted(event: any, d: any) {
    console.log('dragstarted', d);
    event.sourceEvent.stopPropagation();
    if (!event.active) {
      forceSimulation?.alphaTarget(0.1).restart();
    }
    draggingNode = d;
    d.fx = d.x;
    d.fy = d.y;
    nodeFocus(d);
  }

  function dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: any, d: any) {
    if (!event.active) {
      forceSimulation?.alphaTarget(0).stop();
    }

    draggingNode = undefined;
    d.fx = event.x;
    d.fy = event.y;
    nodeFocus(d);
  }

  return d3
    .drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
};

// highlighting helpers
let linkedByIndex: Record<string, any> = {};
/** 节点高亮 */
function isConnected(a: INode, b: INode) {
  return (
    linkedByIndex[a.id + ',' + b.id] ||
    linkedByIndex[b.id + ',' + a.id] ||
    a.id === b.id
  );
}

/** 节点聚焦 */
function nodeFocus(d: INode) {
  // don't apply focus styles if dragging a node
  if (!draggingNode) {
    d3Node?.style('opacity', (o: INode) => {
      return isConnected(d, o) ? 1 : 0.1;
    });
    d3NodeLabel.attr('display', (o: INode) => {
      return isConnected(d, o) ? 'block' : 'none';
    });
    d3Edge?.style('opacity', (o) => {
      return (o.source as INode).index === d.index ||
        (o.target as INode).index === d.index
        ? 1
        : 0.1;
    });
  }
}

/** 边聚焦 */
function linkFocus(l: IEdge) {
  const sourceNode = l.source as unknown as INode;
  const targetNode = l.target as unknown as INode;
  if (!draggingNode) {
    d3Node?.style('opacity', (o: INode) => {
      // 把边连接的 2 个节点高亮
      return o.index === sourceNode.index || o.index === targetNode.index
        ? 1
        : 0.1;
    });
    d3NodeLabel.attr('display', (o: INode) => {
      // 把边连接的 2 个节点的标签高亮
      return o.index === sourceNode.index || o.index === targetNode.index
        ? 'block'
        : 'none';
    });
    d3Edge?.style('opacity', (o) => {
      // 把这条边高亮
      return (o.source as INode).index === sourceNode.index &&
        (o.target as INode).index === targetNode.index
        ? 1
        : 0.1;
    });
  }
}

/** 接触所有的聚焦高亮 */
function unfocus() {
  d3NodeLabel.attr('display', 'block');
  d3Node?.style('opacity', 1);
  d3Edge?.style('opacity', 1);
}

const ForceGraph = ({
  height = 500,
  weightField,
  nodes,
  edges,

  theme = defaultLightTheme,

  nodeActions = [],
  onNodeClick,

  edgeActions = [],
  onEdgeClick,
}: IForceGraphProps) => {
  const [nodeList] = useState<INode[]>([...nodes]);
  const [edgeList] = useState<IEdge[]>([...edges]);
  const [graphWidth, setGraphWidth] = useState(500);

  // 选中的节点
  const [selectedNode, setSelectedNode] = useState<INode>();
  // 选中的边
  const [selectedEdge, setSelectedEdge] = useState<IEdge>();

  const actionRef = useRef<IAnyWhereContainerRefReturn>(null);
  // const graphContainerRef = useRef<HTMLDivElement>(null);

  const graphContainerRef = useCallback((node) => {
    if (node !== null) {
      setGraphWidth(node.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    drawGraph(nodeList, edgeList);
  }, [JSON.stringify(nodeList), JSON.stringify(edgeList)]);

  useEffect(() => {
    return () => {
      console.log('卸载');
      // 卸载
      d3.zoom().on('zoom', null);
      if (simulation) {
        simulation.on('tick', null);
      }
      d3.drag().on('start', null).on('drag', null).on('end', null);
      if (svg) {
        d3Node?.on('mouseover', null).on('mouseout', null);
        d3Edge?.on('mouseover', null).on('mouseout', null);

        // remove svg elements
        d3Node?.exit().remove();
        d3Edge?.exit().remove();
        d3NodeLabel.exit().remove();
        svg.selectAll('.link').remove();
        svg.selectAll('.node').remove();
        svg.selectAll('.node-label').remove();
        container?.remove();
        svg.remove();
      }

      setTimeout(() => {
        // clean up global vars
        svg = undefined;
        container = undefined;

        d3Node = undefined;
        d3Edge = undefined;
        d3NodeLabel = undefined;
        // zoomTransform = d3.zoomIdentity;

        draggingNode = undefined;
      });
    };
  }, []);

  useEffect(() => {
    // 动态变化主题
    svg?.style('background-color', theme.backgroundColor);
    d3Node?.attr('fill', theme.nodeColor);
    d3NodeLabel?.attr('fill', theme.nodeLabelColor);
    d3Edge?.attr('stroke', theme.edgeColor);
  }, [theme]);

  useEffect(() => {
    svg?.attr('height', height);
    simulation?.force('center', d3.forceCenter(graphWidth / 2, height / 2));
  }, [graphWidth, height]);

  const minMaxForScale = useMemo(() => {
    let nodeMax = 1;
    let nodeMin = 1;

    for (const n of nodeList) {
      if (n[weightField] !== undefined) {
        if (n[weightField] > nodeMax) {
          nodeMax = n[weightField];
        }
        if (n[weightField] < nodeMin) {
          nodeMin = n[weightField];
        }
      }
    }

    let linkMax = 1;
    let linkMin = 1;

    for (const l of edgeList) {
      if (l[weightField] !== undefined) {
        if (l[weightField] > linkMax) {
          linkMax = l[weightField];
        }
        if (l[weightField] < linkMin) {
          linkMin = l[weightField];
        }
      }
    }

    let nodeScaleFactor = (nodeMax - nodeMin) / maxLog;
    if (nodeScaleFactor < 1) {
      nodeScaleFactor = 1;
    }
    let linkScaleFactor = (linkMax - linkMin) / maxLog;
    if (linkScaleFactor < 1) {
      linkScaleFactor = 1;
    }

    return {
      nodeMin,
      nodeMax,
      linkMin,
      linkMax,
      linkScaleFactor,
      nodeScaleFactor,
    };
  }, [weightField, JSON.stringify(nodeList), JSON.stringify(edgeList)]);

  /**
   * 计算边的宽度
   * @param l 边
   * @returns
   */
  const calculateEdgeWeight = (l: IEdge) => {
    let val = weightField ? l[weightField] || 1 : 1;
    if (weightField) {
      val = Math.max(
        Math.log(
          (val - minMaxForScale.linkMin) / minMaxForScale.linkScaleFactor,
        ),
        0,
      );
    }
    return 1 + val;
  };

  /**
   * 计算节点的大小
   * @param n 节点
   * @returns
   */
  const calculateNodeWeight = (n: INode) => {
    let val = weightField ? n[weightField] || 1 : 1;
    if (weightField) {
      val = Math.max(
        Math.log(
          (val - minMaxForScale.nodeMin) / minMaxForScale.nodeScaleFactor,
        ),
        0,
      );
    }
    return 3 + val;
  };

  const calculateNodeLabelOffset = (nl: INode) => {
    const val = calculateNodeWeight(nl);
    return 2 + val;
  };

  const calculateCollisionRadius = (n: INode) => {
    const val = calculateNodeWeight(n);
    return 2 * val;
  };

  /** 显示 Edge 提示框 */
  const showEdgeInfo = (d: IEdge) => {
    svg
      ?.append('foreignObject')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')
      .attr('x', 15)
      .attr('y', 15)
      .attr('width', 400)
      .attr('height', 250)
      .selectAll('.legend-table')
      .data(['legend-table'])
      .join('xhtml:table')
      .classed('legend-table', true)
      .html(() => {
        const returnHtml = `  
        <style>
          .legend-table {
            width: auto;
            height: auto;
            padding: 4px;
            background: #ddd;
            pointer-events: none;
            border-radius: 10px;
            table-layout: fixed;
            border-collapse: separate;
            font-size: 12px;
          }
        
          .legend-table th, .legend-table td {
            line-height: 20px;
            text-align: right;
          }
          .legend-table th {
            width: 50px
          }
        </style>
      
        <table>
          <tr>
            <th>IP_A: </th>
            <td>${(d.source as INode).id}</td>
          </tr>
          <tr>
            <th>IP_B: </th>
            <td>${(d.target as INode).id}</td>
          </tr>
          <tr>
            <th>总流量: </th>
            <td>${formatBytes(d.totalBytes)}</td>
          </tr>
          <tr>
            <th>会话数: </th>
            <td>${formatNumber(d.establishedSessions)}</td>
          </tr>
        </table>
        `;
        return returnHtml;
      });
  };

  const removeLineInfo = () => {
    svg?.selectAll('foreignObject').remove();
  };

  // map which nodes are linked (for highlighting)
  const updateLinkedMap = (links: IEdge[]) => {
    linkedByIndex = {};
    console.log('links', links);
    links.forEach((d) => {
      linkedByIndex[d.source + ',' + d.target] = true;
    });
    console.log('linkedByIndex', linkedByIndex);
  };

  /** 绑定节点事件 */
  const bindNodeEvents = useCallback(() => {
    if (!d3Node) {
      return;
    }
    d3Node
      .on('mouseover', (e: any, d: INode) => {
        console.log('node mouseover', d);
        if (draggingNode) {
          return;
        }
        d3.select(e.currentTarget).style('cursor', 'pointer');
        nodeFocus(d);
      })
      .on('mouseout', (e: any) => {
        d3.select(e.currentTarget).style('cursor', 'default');
        unfocus();
      })
      .on('click', (event: any, d: INode) => {
        // 阻止冒泡
        event.stopPropagation();
        if (draggingNode) {
          return;
        }
        setSelectedEdge(undefined);
        setSelectedNode(d);
        nodeFocus(d);
        console.log('node click', d);

        if (nodeActions.length > 0) {
          // 显示节点操作菜单
          actionRef?.current?.updateVisible(true);
          // 更新弹出菜单的显示位置
          actionRef?.current?.updatePosition({
            left: (event.x as number) + 10,
            top: (event.y as number) + 10,
          });
        }
      })
      // @ts-ignore
      .call(handleDrag(simulation));
  }, [simulation]);

  /** 绑定边事件 */
  const bindEdgeEvents = () => {
    if (!d3Edge) {
      return;
    }
    d3Edge
      .on('mouseover', (e: any, l: IEdge) => {
        if (draggingNode) {
          return;
        }
        d3.select(e.currentTarget).style('cursor', 'pointer');
        // 高亮这条边和 2 个节点
        linkFocus(l);
        showEdgeInfo(l);
      })
      .on('mouseout', (e: any) => {
        d3.select(e.currentTarget).style('cursor', 'default');
        unfocus();
        removeLineInfo();
      })
      .on('click', (event: any, d: IEdge) => {
        // 阻止冒泡
        event.stopPropagation();
        setSelectedNode(undefined);
        setSelectedEdge(d);
        console.log('edge click', event);
        console.log('edge click', d);

        if (nodeActions.length > 0) {
          // 显示节点操作菜单
          actionRef?.current?.updateVisible(true);
          // 更新弹出菜单的显示位置
          actionRef?.current?.updatePosition({
            left: (event.x as number) + 10,
            top: (event.y as number) + 10,
          });
        }
      });
  };

  /**
   * 画图
   */
  const drawGraph = (nodesData: INode[], linksData: IEdge[]) => {
    if (svg) {
      // remove any existing nodes
      d3Node!.exit().remove();
      d3Edge!.exit().remove();
      d3NodeLabel.exit().remove();
      svg.selectAll('.link').remove();
      svg.selectAll('.node').remove();
      svg.selectAll('.node-label').remove();
    }

    if (!nodesData.length) {
      return;
    }

    const nodesDataCopy = nodesData.map((d) => Object.create(d));
    const linksDataCopy = linksData.map((d) => Object.create(d));

    updateLinkedMap(linksDataCopy);

    if (!svg) {
      svg = d3
        .select('.connections-graph')
        .attr('width', '100%')
        .attr('height', height)
        .attr('id', 'graphSvg');
    }

    // setup the force directed graph
    simulation = d3
      .forceSimulation(nodesDataCopy)
      //link froce(弹簧模型) 可以根据 link distance 将有关联的两个节点拉近或者推远。力的强度与被链接两个节点的距离成比例，类似弹簧力
      .force(
        'link',
        d3.forceLink(linksDataCopy).id((d) => {
          return (d as INode).id; // tell the links where to link
        }),
      )
      //作用力应用在所用的节点之间，当strength为正的时候可以模拟重力，当为负的时候可以模拟电荷力
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(80))
      //设置节点碰撞半径>= 点半径避免重叠
      .force(
        'collision',
        d3.forceCollide().radius((n) => calculateCollisionRadius(n as INode)),
      )
      //centering 作用力可以使得节点布局开之后围绕某个中心
      .force('center', d3.forceCenter(graphWidth / 2, height / 2))
      // positioning force along x-axis for disjoint graph
      .force('x', d3.forceX())
      // positioning force along y-axis for disjoint graph
      .force('y', d3.forceY());

    if (!container) {
      // add container for zoomability
      // @ts-ignore
      container = svg.append('g');
    }

    svg
      .call(
        (d3Zoom = d3
          .zoom()
          .scaleExtent([0.5, 4])
          .on('zoom', (event) => {
            zoomTransform = event.transform;
            container!.attr('transform', event.transform);
          })),
      )
      .on('click', () => {
        console.log('svg click');
        setSelectedNode(undefined);
        actionRef?.current?.updateVisible(false);
      });

    // add links
    d3Edge = container
      .append('g')
      .attr('class', 'link-wrap')
      .attr('stroke', theme.edgeColor)
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(linksDataCopy)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('id', function (d, i) {
        return 'link-path-' + i;
      })
      .attr('stroke-width', calculateEdgeWeight);

    // add link mouse listeners
    bindEdgeEvents();

    // add nodes
    d3Node = container
      .append('g')
      .attr('class', 'node-wrap')
      .selectAll('circle')
      .data(nodesDataCopy)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('id', (d) => {
        return 'id' + d.id.replace(idRegex, '_');
      })
      .attr('fill', () => {
        return theme.nodeColor;
      })
      .attr('r', calculateNodeWeight);
    // 节点外围的圆圈
    // .attr('stroke', theme.nodeColor)
    // .attr('stroke-width', 0.5);

    // Node 节点绑定事件
    bindNodeEvents();

    // add node labels
    d3NodeLabel = container
      .append('g')
      .attr('class', 'node-label-wrap')
      .selectAll('text')
      .data(nodesDataCopy)
      .enter()
      .append('text')
      .attr('dx', calculateNodeLabelOffset)
      .attr('id', (d) => {
        return 'id' + d.id.replace(idRegex, '_') + '-label';
      })
      .attr('dy', '2px')
      .attr('class', 'node-label')
      .attr('fill', theme.nodeLabelColor)
      .style('font-size', '12px')
      .style('font-weight', 'normal')
      .style('font-style', 'normal')
      .style('pointer-events', 'none') // to prevent mouseover/drag capture
      .text((d) => {
        return d.id;
      });

    // listen on each tick of the simulation's internal timer
    simulation?.on('tick', () => {
      // position links
      d3Edge!
        .attr('x1', (d) => (d.source as INode).x!)
        .attr('y1', (d) => (d.source as INode).y!)
        .attr('x2', (d) => (d.target as INode).x!)
        .attr('y2', (d) => (d.target as INode).y!);

      // position nodes
      d3Node!.attr('cx', (d: INode) => d.x!).attr('cy', (d: INode) => d.y!);

      // position node labels
      d3NodeLabel.attr(
        'transform',
        (d: INode) => 'translate(' + d.x + ',' + d.y + ')',
      );
    });
  };

  const handleControlClick = (action: IControlAction) => {
    switch (action.key) {
      case 'zoomIn':
        svg!.transition().duration(500).call(d3Zoom.scaleBy, 0.5);
        break;
      case 'zoomOut':
        svg!.transition().duration(500).call(d3Zoom.scaleBy, 2);
        break;
      case 'lock':
        lockAllNode();
        break;
      case 'unlock':
        unLockAllNode();
        break;
      case 'save':
        exportPng();
        break;

      default:
        break;
    }
  };

  return (
    <>
      <div
        ref={graphContainerRef}
        style={{
          position: 'relative',
          height: height,
        }}
      >
        <svg className="connections-graph"></svg>
        <GraphControl onClick={handleControlClick} />
        <AnyWhereContainer ref={actionRef} style={{ padding: 0 }}>
          {selectedNode && nodeActions.length > 0 && (
            <ul>
              {nodeActions.map((action) => (
                <li
                  key={action.key}
                  onClick={() => {
                    if (onNodeClick && selectedNode) {
                      // 传递 click
                      onNodeClick(action, selectedNode!);
                      // 移除菜单
                      actionRef?.current?.updateVisible(false);
                      setSelectedNode(undefined);
                    }
                  }}
                >
                  {action.label}
                </li>
              ))}
            </ul>
          )}
          {selectedEdge && edgeActions.length > 0 && (
            <ul>
              {edgeActions.map((action) => (
                <li
                  key={action.key}
                  onClick={() => {
                    if (onEdgeClick && selectedEdge) {
                      // 传递 click
                      onEdgeClick(action, selectedEdge!);
                      // 移除菜单
                      actionRef?.current?.updateVisible(false);
                      setSelectedEdge(undefined);
                    }
                  }}
                >
                  {action.label}
                </li>
              ))}
            </ul>
          )}
        </AnyWhereContainer>
      </div>
    </>
  );
};

export { IForceGraphProps };
export { defaultLightTheme, defaultDarkTheme };
export default ForceGraph;
