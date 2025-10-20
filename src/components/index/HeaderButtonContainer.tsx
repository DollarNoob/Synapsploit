interface Props {
  children?: React.ReactNode;
}

export default function HeaderButtonContainer({ children }: Props) {
  const style: React.CSSProperties = {
    display: "flex"
  };

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
