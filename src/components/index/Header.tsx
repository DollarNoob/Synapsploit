interface Props {
  children?: React.ReactNode;
}

export default function Header({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    position: "relative",
    height: 30,
    backgroundColor: "#3C3C3C",
    justifyContent: "space-between"
  };

  return (<>
    <header style={ style } data-tauri-drag-region>
      { children }
    </header>
  </>);
}
