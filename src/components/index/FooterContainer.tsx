interface Props {
  children?: React.ReactNode;
}

export default function FooterContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    height: 33,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
    justifyContent: "space-between"
  };

  return (<>
    <footer style={ style }>
      { children }
    </footer>
  </>);
}
