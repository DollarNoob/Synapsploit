interface Props {
  children?: React.ReactNode;
}

export default function SettingContainer({ children }: Props) {
  const style: React.CSSProperties = {};

  return (<>
    <div style={ style }>
      { children }
    </div>
  </>);
}
