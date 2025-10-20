interface Props {
  children?: React.ReactNode;
}

export default function TabContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    height: 20,
    overflowX: "scroll",
    overflowY: "hidden",
    whiteSpace: "nowrap"
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
