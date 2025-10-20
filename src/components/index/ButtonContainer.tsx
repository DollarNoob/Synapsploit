interface Props {
  children?: React.ReactNode;
}

export default function ButtonContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex",
    gap: 5
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
