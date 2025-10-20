import synapsex from "../../assets/synapsex.ico";

interface Props {
  children?: React.ReactNode;
}

export default function Icon({ children }: Props) {
  const style: React.CSSProperties = {
    width: 30,
    height: 30,
    marginLeft: 3
  };

  return (<>
    <img src={ synapsex } style={ style } alt="Synapse X Icon" draggable={ false } data-tauri-drag-region>
      { children }
    </img>
  </>);
}
