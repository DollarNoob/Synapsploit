interface Props {
  children?: React.ReactNode;
}

export default function Main({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    marginLeft: 10,
    marginRight: 10,
    gap: 5,
    flex: 1
  };

  return (<>
    <main style={ style }>
      { children }
    </main>
  </>);
}
