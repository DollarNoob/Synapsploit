interface Props {
  children?: React.ReactNode;
}

export default function Footer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    height: 30,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10
  };

  return (<>
    <footer style={ style }>
      { children }
    </footer>
  </>);
}
