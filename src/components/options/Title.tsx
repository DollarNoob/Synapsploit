interface Props {
  children?: React.ReactNode;
}

export default function Title({ children }: Props) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "white",
    fontFamily: "Segoe UI"
  };

  return (<>
    <div style={ style } data-tauri-drag-region>
      { children }
    </div>
  </>);
}
