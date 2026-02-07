import { LoaderCircle } from "lucide-react";
import React from "react";

const Loader = () => {
  return (
    <div className="fixed w-screen h-screen top-0 left-0 backdrop-blur-sm z-[99999999999]">
      <div className="flex items-center justify-center h-full">
        <div className="spinner-loader" />
      </div>
    </div>
  );
};

export default Loader;
