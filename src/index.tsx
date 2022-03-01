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
let zoom: any;

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
    d.fx = null;
    d.fy = null;
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
  // TODO: 高连边和节点
  if (!draggingNode) {
    node.style("opacity", (o: INode) => {
      return o.index === sourceNode.index || o.index === targetNode.index
        ? 1
        : 0.1;
    });
    nodeLabel.attr("display", (o: INode) => {
      return o.index === sourceNode.index || o.index === targetNode.index
        ? "block"
        : "none";
    });
    link.style("opacity", (o: INode) => {
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
      .force(
        "link",
        d3.forceLink(links).id((d) => {
          return (d as INode).id; // tell the links where to link
        })
      )
      // simulate gravity mutually amongst all nodes
      .force("charge", d3.forceManyBody().strength(-40 * 2))
      // prevent elements from overlapping
      .force(
        "collision",
        d3.forceCollide().radius((n) => calculateCollisionRadius(n as INode))
      )
      // set the graph center
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
      .attr("stroke", foregroundColor)
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(linksData)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke-width", calculateLinkWeight);

    // add link mouse listeners
    link
      .on("mouseover", (e: any, l: ILink) => {
        if (draggingNode) {
          return;
        }
        // 高亮这条边和 2 个节点
        linkFocus(l);
        console.log(e);
        console.log(l);
        console.log(node);
        console.log(link);
      })
      .on("mouseout", () => {
        unfocus();
      });

    // add nodes
    node = container
      .append("g")
      .selectAll("circle")
      .data(nodesData)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("id", (d) => {
        return "id" + d.id.replace(idRegex, "_");
      })
      .attr("fill", (d) => {
        // TODO: 聚合填充颜色
        // 现在先指定颜色
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
        console.log(d);
        if (draggingNode) {
          return;
        }
        nodeFocus(d);
      })
      .on("mouseout", (d: INode) => {
        unfocus();
      });

    // add node labels
    nodeLabel = container
      .append("g")
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

      // position nodes
      node.attr("cx", (d: INode) => d.x).attr("cy", (d: INode) => d.y);

      // position node labels
      nodeLabel.attr("transform", function (d: INode) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    });
  }, []);

  return <svg className="connections-graph"></svg>;
};

export default ForceGraph;
