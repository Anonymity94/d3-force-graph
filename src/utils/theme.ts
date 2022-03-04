import { ITheme } from '../typings';

/** 默认的 Light 主题 */
export const defaultLightTheme: ITheme = {
  mode: 'light',
  backgroundColor: '#fff',
  nodeColor: '#66b689',
  nodeLabelColor: '#333',
  edgeColor: '#303030',
};
/** 默认的 Dark 主题 */
export const defaultDarkTheme: ITheme = {
  mode: 'dark',
  backgroundColor: '#333',
  nodeColor: '#66b689',
  nodeLabelColor: 'rgb(255 255 255 / 80%)',
  edgeColor: 'rgb(255 255 255 / 80%)',
};
