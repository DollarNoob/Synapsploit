interface Props {
  active: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

export default function Tab({ active, onClick, children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    minWidth: "min-content",
    flexGrow: 1,
    backgroundColor: active ? "#757575" : "#858585",
    justifyContent: "center"
  };

  const textStyle: React.CSSProperties = {
    lineHeight: 1.8,
    fontFamily: "Segoe UI",
    fontSize: 12,
    textAlign: "center"
  };

  return (<>
    <div style={ style } onClick={ onClick }>
      <span style={ textStyle }>{ children }</span>
    </div>
  </>);
}
