interface Props {
  children?: React.ReactNode;
}

export default function TabContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    width: "100%",
    height: 20
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
