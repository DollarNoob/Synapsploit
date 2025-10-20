interface Props {
  active: boolean;
  children?: React.ReactNode;
}

export default function OptionContainer({ active, children }: Props) {
  const style: React.CSSProperties = {
    display: active ? "flex" : "none",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
