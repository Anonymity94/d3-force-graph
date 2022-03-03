import numeral from 'numeral';
import * as saveSvgAsPng from 'save-svg-as-png';
import { foregroundColor } from '../index';

/**
 * @see https://api.highcharts.com.cn/highcharts#lang.numericSymbols
 * @see https://zh.wikipedia.org/wiki/%E5%9B%BD%E9%99%85%E5%8D%95%E4%BD%8D%E5%88%B6%E8%AF%8D%E5%A4%B4
 * @param value 格式化的数组
 * @returns number 返回格式化后的字符串
 */
export const formatNumber: (value: number) => string = (value: number) => {
  if (value === 0) return '0';
  const prefixs = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  const i = Math.floor(Math.log(value) / Math.log(1000));
  return `${numeral((value / Math.pow(1000, i)).toFixed(2)).value()}${
    i >= 0 ? prefixs[i] : prefixs[0]
  }`;
};

/**
 * 格式化字节数
 * @param bytes Bytes
 * @param decimal 保留小数位数
 * @param unit 进制
 * @returns
 */
export function formatBytes(
  bytes: number,
  decimal = 3,
  unit: 1000 | 1024 = 1000,
) {
  if (bytes === 0) return '0KB';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${numeral((bytes / Math.pow(unit, i)).toFixed(decimal)).value()}${
    i >= 0 ? sizes[i] : sizes[0]
  }`;
}

export function exportPng() {
  saveSvgAsPng.saveSvgAsPng(
    document.getElementById('graphSvg'),
    'connections.png',
    {
      // backgroundColor: this.backgroundColor,
      modifyCss: function (selector: any, properties: any) {
        if (selector === '.connections-graph text') {
          // remove .connections-page from selector since element is
          // rendered outside connections page for saving as png
          selector = 'text';
          // make sure that the text uses the foreground property
          // saveSvgAsPng cannot resolve var(--color-foreground)
          properties = `fill: ${foregroundColor}`;
        }
        return selector + '{' + properties + '}';
      },
    },
  );
}
