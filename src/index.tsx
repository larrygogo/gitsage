/* @refresh reload */
import { render } from "solid-js/web";
import "@/assets/styles/global.css";
import App from "@/App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("找不到 #root 元素，请检查 index.html");
}

render(() => <App />, root);
