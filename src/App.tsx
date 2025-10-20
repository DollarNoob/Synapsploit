import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/index";
import Options from "./pages/options";
import "./App.css";

function App() {
  function onContextMenu(event: MouseEvent) {
    if (!(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
    }
  }

  useEffect(() => {
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={ <Index/> }/>
        <Route path="/options" element={ <Options/> }/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
