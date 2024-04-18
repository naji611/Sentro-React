// App.js
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./login";
import SignUpPage from "./signup";
import HomePage from "./home";
import ChatPage from "./chat";

const App = () => {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/signup" element={<SignUpPage setUser={setUser} />} />
        <Route
          path="/home"
          element={user ? <HomePage user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/chat/:friendId"
          element={user ? <ChatPage user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
};

export default App;
