import React from 'react';
import lock from './assets/lock.svg';
import save from './assets/save.svg';
import unlock from './assets/unlock.svg';
import zoomIn from './assets/zoom-in.svg';
import zoomOut from './assets/zoom-out.svg';
import styles from './index.less';

export interface IControlAction {
  key: 'zoomOut' | 'zoomIn' | 'lock' | 'unlock' | 'save';
  icon: any;
  description: string;
}

interface IGraphControlProps {
  onClick?: (action: IControlAction) => void;
}
const GraphControl = ({ onClick }: IGraphControlProps) => {
  const controlActions: IControlAction[] = [
    {
      key: 'zoomOut',
      icon: zoomIn,
      description: '放大',
    },
    {
      key: 'zoomIn',
      icon: zoomOut,
      description: '缩小',
    },
    {
      key: 'lock',
      icon: lock,
      description: '锁定布局',
    },
    {
      key: 'unlock',
      icon: unlock,
      description: '解锁布局',
    },
    {
      key: 'save',
      icon: save,
      description: '保存成图片',
    },
  ];

  return (
    <div className={styles.control}>
      {controlActions.map((action) => (
        <div
          key={action.key}
          className={styles['control-item']}
          onClick={() => {
            if (onClick) {
              onClick(action);
            }
          }}
          title={action.description}
        >
          <img className={styles['control-item__icon']} src={action.icon} />
        </div>
      ))}
    </div>
  );
};

export default GraphControl;
