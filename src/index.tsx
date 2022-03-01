import * as d3 from "d3";
import { Simulation, SimulationLinkDatum } from "d3";
import React, { useCallback, useEffect, useMemo } from "react";
import type { IForceGraphProps, IGraphData, ILink, INode } from "./typings";

let simulation: Simulation<INode, undefined>;
// d3中所有的 node 节点
let node: any;
let draggingNode: any;
// d3中所有的边
let link: any;
// d3中所有的节点标签
let nodeLabel: any;
let container: d3.Selection<any, unknown, any, any>;
let svg: d3.Selection<any, unknown, any, any>;

const maxLog = Math.ceil(Math.pow(Math.E, 9));

const idRegex = /[\[\]:. ]/g;

// 节点的颜色
const foregroundColor = "#303030";

/** 节点拖拽 */
function drag(simulation: Simulation<INode, undefined>) {
  function dragstarted(event: any, d: any) {
    event.sourceEvent.stopPropagation();
    if (!event.active) {
      simulation.alphaTarget(0.1).restart();
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
      simulation.alphaTarget(0).stop();
    }
    draggingNode = undefined;
    d.fx = event.x;
    d.fy = event.y;
    nodeFocus(d);
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// highlighting helpers
let linkedByIndex: Record<string, any> = {};
/** 节点高亮 */
function isConnected(a: INode, b: INode) {
  return (
    linkedByIndex[a.id + "," + b.id] ||
    linkedByIndex[b.id + "," + a.id] ||
    a.id === b.id
  );
}

/** 节点聚焦 */
function nodeFocus(d: INode) {
  // don't apply focus styles if dragging a node
  if (!draggingNode) {
    node.style("opacity", (o: INode) => {
      return isConnected(d, o) ? 1 : 0.1;
    });
    nodeLabel.attr("display", (o: INode) => {
      return isConnected(d, o) ? "block" : "none";
    });
    link.style("opacity", (o: INode) => {
      return o.source.index === d.index || o.target.index === d.index ? 1 : 0.1;
    });
  }
}

/** 边聚焦 */
function linkFocus(l: ILink) {
  const sourceNode = l.source as unknown as INode;
  const targetNode = l.target as unknown as INode;
  if (!draggingNode) {
    node.style("opacity", (o: INode) => {
      // 把边连接的 2 个节点高亮
      return o.index === sourceNode.index || o.index === targetNode.index
        ? 1
        : 0.1;
    });
    nodeLabel.attr("display", (o: INode) => {
      // 把边连接的 2 个节点的标签高亮
      return o.index === sourceNode.index || o.index === targetNode.index
        ? "block"
        : "none";
    });
    link.style("opacity", (o: INode) => {
      // 把这条边高亮
      return o.source.index === sourceNode.index &&
        o.target.index === targetNode.index
        ? 1
        : 0.1;
    });
  }
}

/** 接触所有的聚焦高亮 */
function unfocus() {
  nodeLabel.attr("display", "block");
  node.style("opacity", 1);
  link.style("opacity", 1);
}

const ForceGraph = ({
  width = 200,
  height = 200,
  weightField,
  nodes,
  links,
}: IForceGraphProps) => {
  useEffect(() => {
    drawGraph({ nodes, links });

    console.log(nodes);
  }, [JSON.stringify(nodes), JSON.stringify(links)]);

  const minMaxForScale = useMemo(() => {
    let nodeMax = 1;
    let nodeMin = 1;

    for (const n of nodes) {
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

    for (const l of links) {
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
  }, [weightField, JSON.stringify(nodes), JSON.stringify(links)]);

  /**
   * 计算边的宽度
   * @param l 边
   * @returns
   */
  const calculateLinkWeight = (l: ILink) => {
    let val = weightField ? l[weightField] || 1 : 1;
    if (weightField) {
      val = Math.max(
        Math.log(
          (val - minMaxForScale.linkMin) / minMaxForScale.linkScaleFactor
        ),
        0
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
          (val - minMaxForScale.nodeMin) / minMaxForScale.nodeScaleFactor
        ),
        0
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

  const inderInfo = (d: ILink) => {
    svg
      .append("foreignObject")
      .attr("id", "label")
      .attr("pointer-events", "none")
      .style("user-select", "none")
      .attr("x", 15)
      .attr("y", 15)
      .attr("width", 300)
      .attr("height", 250)
      .selectAll(".legend-table")
      .data(["legend-table"])
      .join("xhtml:table")
      .classed("legend-table", true)
      .html(() => {
        const returnHtml = `  
        <style>
          table {
            width: auto;
            height: auto;
            padding: 8px;
            background: #ddd;
            pointer-events: none;
            border-radius: 10px;
          }
        
          th, td {
            padding: 6px;
            text-align:right;
          }
        </style>
      
        <table>
          <tr>
            <th>IP_A: <th>
            <td>${(d.source as INode).id}</td>
          </tr>
          <tr>
            <th>IP_B: <th>
            <td>${(d.target as INode).id}</td>
          </tr>
          <tr>
            <th>总流量: <th>
            <td>${d.totalBytes}</td>
          </tr>
          <tr>
            <th>会话数: <th>
            <td>${d.establishedSessions}</td>
          </tr>
        </table>
        `;
        return returnHtml;
      });
  };

  const removeInfo = () => {
    svg.selectAll("foreignObject").remove();
  };

  /**
   * 画图
   */
  const drawGraph = useCallback((data: IGraphData) => {
    if (svg) {
      // remove any existing nodes
      node.exit().remove();
      link.exit().remove();
      nodeLabel.exit().remove();
      svg.selectAll(".link").remove();
      svg.selectAll(".node").remove();
      svg.selectAll(".node-label").remove();
    }

    if (!data.nodes.length) {
      return;
    }

    // map which nodes are linked (for highlighting)
    linkedByIndex = {};
    data.links.forEach((d) => {
      linkedByIndex[d.source + "," + d.target] = true;
    });

    // get the node and link data
    const linksData = data.links.map((d) => Object.create(d));
    const nodesData = data.nodes.map((d) => Object.create(d));

    // setup the force directed graph
    simulation = d3
      .forceSimulation(nodesData)
      //link froce(弹簧模型) 可以根据 link distance 将有关联的两个节点拉近或者推远。力的强度与被链接两个节点的距离成比例，类似弹簧力
      .force(
        "link",
        d3.forceLink(links).id((d) => {
          return (d as INode).id; // tell the links where to link
        })
      )
      //作用力应用在所用的节点之间，当strength为正的时候可以模拟重力，当为负的时候可以模拟电荷力
      .force("charge", d3.forceManyBody().strength(-100).distanceMin(80))
      //设置节点碰撞半径>= 点半径避免重叠
      .force(
        "collision",
        d3.forceCollide().radius((n) => calculateCollisionRadius(n as INode))
      )
      //centering 作用力可以使得节点布局开之后围绕某个中心
      .force("center", d3.forceCenter(width / 2, height / 2))
      // positioning force along x-axis for disjoint graph
      .force("x", d3.forceX())
      // positioning force along y-axis for disjoint graph
      .force("y", d3.forceY());

    if (!svg) {
      svg = d3
        .select(".connections-graph")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "graphSvg");
    }

    if (!container) {
      // add container for zoomability
      // @ts-ignore
      container = svg.append("g");
    }

    // add zoomability

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        })
    );

    // add links
    link = container
      .append("g")
      .attr("class", "link-wrap")
      .attr("stroke", foregroundColor)
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(linksData)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("id", function (d, i) {
        return "link-path-" + i;
      })
      .attr("stroke-width", calculateLinkWeight);

    // const edgepaths = container
    //   .append("g")
    //   .attr("class", "link-path-wrap")
    //   .selectAll(".edgepath")
    //   .data(linksData)
    //   .enter()
    //   .append("path")
    //   .attr(
    //     "d",
    //     (d) =>
    //       "M " +
    //       d.source.x +
    //       " " +
    //       d.source.y +
    //       " L " +
    //       d.target.x +
    //       " " +
    //       d.target.y
    //   )
    //   .attr("class", "edgepath")
    //   .attr("id", (d, i) => `edgepath${i}`)
    //   .style("pointer-events", "none");

    // const edgelabels = container
    //   .append("g")
    //   .attr("class", "link-label-wrap")
    //   .selectAll(".edgelabel")
    //   .data(linksData)
    //   .enter()
    //   .append("text")
    //   .style("pointer-events", "none")
    //   .attr("class", "edgelabel")
    //   .attr("id", (d, i) => "edgelabel" + i)
    //   .attr("dy", (d, i) => calculateLinkWeight(d) + 0)
    //   .attr("dx", 80)
    //   .attr("font-size", 10)
    //   .attr("fill", "red");

    // edgelabels
    //   .append("textPath")
    //   .attr("xlink:href", function (d, i) {
    //     return "#edgepath" + i;
    //   })
    //   .style("pointer-events", "none")
    //   .text(function (d, i) {
    //     return "label " + i;
    //   });

    // add link mouse listeners
    link
      .on("mouseover", (e: any, l: ILink) => {
        if (draggingNode) {
          return;
        }
        // 高亮这条边和 2 个节点
        linkFocus(l);
        inderInfo(l);
        console.log(e);
        console.log(l);
        console.log(node);
        console.log(link);
      })
      .on("mouseout", () => {
        unfocus();
        removeInfo();
      });

    // add nodes
    node = container
      .append("g")
      .attr("class", "node-wrap")
      .selectAll("circle")
      .data(nodesData)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("id", (d) => {
        return "id" + d.id.replace(idRegex, "_");
      })
      .attr("fill", (d) => {
        return "#66b689";
      })
      .attr("r", calculateNodeWeight)
      .attr("stroke", foregroundColor)
      .attr("stroke-width", 0.5)
      // @ts-ignore
      .call(drag(simulation));

    // add node mouse listeners for showing focus and popups
    node
      .on("mouseover", (e: any, d: INode) => {
        if (draggingNode) {
          return;
        }
        console.log(d);
        nodeFocus(d);
      })
      .on("mouseout", (d: INode) => {
        unfocus();
      })
      .on("click", (d: INode) => {
        if (draggingNode) {
          return;
        }
        nodeFocus(d);
        console.log(d);
      });

    // add node labels
    nodeLabel = container
      .append("g")
      .attr("class", "node-label-wrap")
      .selectAll("text")
      .data(nodesData)
      .enter()
      .append("text")
      .attr("dx", calculateNodeLabelOffset)
      .attr("id", (d) => {
        return "id" + d.id.replace(idRegex, "_") + "-label";
      })
      .attr("dy", "2px")
      .attr("class", "node-label")
      .style("font-size", "12px")
      .style("font-weight", "normal")
      .style("font-style", "normal")
      .style("pointer-events", "none") // to prevent mouseover/drag capture
      .text((d) => {
        return d.id;
      });

    // listen on each tick of the simulation's internal timer
    simulation.on("tick", () => {
      // position links
      link
        .attr("x1", (d: SimulationLinkDatum<INode>) => (d.source as INode).x)
        .attr("y1", (d: SimulationLinkDatum<INode>) => (d.source as INode).y)
        .attr("x2", (d: SimulationLinkDatum<INode>) => (d.target as INode).x)
        .attr("y2", (d: SimulationLinkDatum<INode>) => (d.target as INode).y);

      // edgepaths.attr("d", function (d) {
      //   var path =
      //     "M " +
      //     d.source.x +
      //     " " +
      //     d.source.y +
      //     " L " +
      //     d.target.x +
      //     " " +
      //     d.target.y;
      //   //console.log(d)
      //   return path;
      // });

      // position nodes
      node.attr("cx", (d: INode) => d.x).attr("cy", (d: INode) => d.y);

      // position node labels
      nodeLabel.attr(
        "transform",
        (d: INode) => "translate(" + d.x + "," + d.y + ")"
      );
    });
  }, []);

  return <svg className="connections-graph"></svg>;
};

export default ForceGraph;
