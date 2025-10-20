import { useEffect, useState } from "react";

interface Props {
  active: boolean;
  name: string;
  onChange: (key: string, value: boolean | string) => void;
  children?: React.ReactNode;
}

export default function Option({ active, name, onChange, children }: Props) {
  const [ checked, setChecked ] = useState(active);

  function updateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setChecked(event.target.checked);
    onChange(name, event.target.checked);
  }

  useEffect(() => {
    setChecked(active);
  }, [ active ]);

  const style: React.CSSProperties = {
    display: "flex",
    gap: 5,
    fontFamily: "Segoe UI",
    fontSize: 13,
    alignItems: "center"
  };

  return (<>
    <div style={ style }>
      <input type="checkbox" id={ name } checked={ checked } onChange={ updateChange }/>
      <label htmlFor={ name }>{ children }</label>
    </div>
  </>);
}
