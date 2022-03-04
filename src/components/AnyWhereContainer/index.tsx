import React, { ReactNode, useImperativeHandle, useState } from 'react';
import styles from './index.less';

interface IPosition {
  top?: number;
  left?: number;
}

interface IAnyWhereContainerProps extends IPosition {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

export interface IAnyWhereContainerRefReturn {
  updatePosition: (pos: IPosition) => void;
  updateVisible: (visible: boolean) => void;
}

const AnyWhereContainer = React.forwardRef<
  IAnyWhereContainerRefReturn,
  IAnyWhereContainerProps
>((props, ref) => {
  const { top, left, children, className, style } = props;

  const [position, setPosition] = useState<IPosition>({
    top: top !== undefined ? top : -999,
    left: left !== undefined ? left : -999,
  });

  const [visible, setVisible] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    updatePosition: (pos: IPosition) => {
      return setPosition(pos);
    },
    updateVisible: (visible: boolean) => {
      return setVisible(visible);
    },
  }));

  if (!visible) {
    return null;
  }

  return (
    <>
      <div className={styles.container} style={{ ...style, ...position }}>
        {children}
      </div>
    </>
  );
});

export default AnyWhereContainer;
