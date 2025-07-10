import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

export default function HelpMenu() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "h") {
        setShow((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              padding: "14px 18px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              borderRadius: 10,
              fontSize: 14,
              maxWidth: 320,
              zIndex: 20,
              boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HelpCircle size={18} />
              <strong>Game Controls</strong>
            </div>
            <ul style={{ paddingLeft: 20, marginTop: 10, lineHeight: 1.5 }}>
              <li>Click on scene to toggle camera</li>
              <li>Move mouse to rotate view</li>
              <li>
                Press <kbd>H</kbd> to hide this panel
              </li>
              <li>
                <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> to move
              </li>
              <li>
                <kbd>Space</kbd> to jump
              </li>
              <li>
                <kbd>Space</kbd> then arrow keys for precise air control
              </li>
              <li>
                <kbd>Arrow</kbd> + <kbd>Space</kbd> for Super Jump
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)",
              padding: "8px 12px",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              zIndex: 10,
            }}
          >
            Press <kbd>H</kbd> for help
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
