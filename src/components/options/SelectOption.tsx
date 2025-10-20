import { useEffect, useState } from "react";

interface Props {
  selected: string;
  name: string;
  items: string[];
  onChange: (key: string, value: boolean | string) => void;
  children?: React.ReactNode;
}

export default function SelectOption({ selected, name, items, onChange, children }: Props) {
  const [ selection, setSelection ] = useState(selected);

  function updateChange(event: React.MouseEvent<HTMLDivElement>) {
    let target = event.target;
    if (target instanceof HTMLSpanElement) target = target.parentElement!;
    const value = (target as HTMLDivElement).getAttribute("data-value")!;
    setSelection(value);
    onChange(name, value);
  }

  useEffect(() => {
    setSelection(selected);
  }, [ selected ]);

  const style: React.CSSProperties = {
    display: "flex"
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    paddingLeft: 8,
    paddingRight: 8
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "Segoe UI",
    fontSize: 13
  };

  const textStyle: React.CSSProperties = {
    lineHeight: 1.8,
    fontFamily: "Segoe UI",
    fontSize: 12
  };

  return (<>
    <span style={ titleStyle }>{ children }</span>
    <div style={ style }>
      {
        items.map((item, i) => (
          <div key={ i } style={ { ...itemStyle, backgroundColor: selection === item ? "#757575" : "#858585" } } onClick={ updateChange } data-value={ item }>
            <span style={ textStyle }>{ item }</span>
          </div>
        ))
      }
    </div>
  </>);
}
