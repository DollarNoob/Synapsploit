interface Props {
  children?: React.ReactNode;
}

export default function EditorContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flex: 1
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
