import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

import messageReceivedSound from "./receved.mp3";
import socket from "./socket";

const Notification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Automatically close the notification after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className="notification-p">{message}</div>;
};

const HomePage = ({ user }) => {
  const [friends, setFriends] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const messageReceivedAudio = new Audio(messageReceivedSound);

  const fetchFriends = async () => {
    try {
      const response = await fetch("http://localhost:3001/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFriends(data.friends);
        setFriendRequests(data.requests);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  };

  useEffect(() => {
    socket.emit("user-connected", { userId: user.id });
    fetchFriends();
    socket.on("new-friend-request", () => {
      fetchFriends();
    });
    socket.on("new-message", (newMessage) => {
      messageReceivedAudio.play();
      fetchFriends();
      setFriends((prevFriends) =>
        prevFriends.map((friend) =>
          friend.id === newMessage.senderId
            ? { ...friend, notifications: friend.notifications + 1 }
            : friend
        )
      );
    });

    return () => {
      socket.off("new-message");
    };
  }, [user]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("http://localhost:3001/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: searchTerm,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const response = await fetch("http://localhost:3001/addFriend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          friendId: friendId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.message) {
          setNotification(data.message);
        } else {
          throw new Error("Failed to add friend");
        }
      }

      const data = await response.json();
      setFriends([...friends, data]);
      setNotification("Friend request sent successfully!");
    } catch (error) {
      console.log(error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/acceptFriend/${friendId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        if (data.message) {
          setError(data.message);
        } else {
          throw new Error("Failed to accept friend request");
        }
      } else {
        console.log("Friend request accepted successfully!");
        socket.emit("accept-friend", { receiverId: friendId });
        // Remove the accepted request from the friendRequests array
        setFriendRequests((prevRequests) =>
          prevRequests.filter((request) => request.id !== friendId)
        );
        fetchFriends();
      }
    } catch (error) {
      console.error(error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleRejectRequest = async (friendId) => {
    try {
      // Implement rejecting friend request
      console.log("Friend request rejected successfully!");
      // Remove the rejected request from the friendRequests array
      setFriendRequests((prevRequests) =>
        prevRequests.filter((request) => request.id !== friendId)
      );
    } catch (error) {
      console.log(error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleLogout = () => {
    socket.emit("user-disconnected", { userId: user.id });
    localStorage.removeItem("user");
    window.location.href = "/login";
    console.log("Logout");
  };

  return (
    <div className="home-container">
      {notification && (
        <Notification
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
      <h2>Welcome, {user.name}!</h2>
      <button onClick={handleLogout}>Logout</button>
      <div>
        <h3>Friends List</h3>
        {friends.length > 0 ? (
          <ul className="friends-list">
            {friends.map((friend) => (
              <li key={friend.id}>
                <Link to={`/chat/${friend.id}`}>
                  {friend.name}
                  {friend.notifications > 0 && (
                    <span className="notification">{friend.notifications}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No friends found.</p>
        )}
      </div>
      <div>
        <h3>Add Friend</h3>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Enter friend's name"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>
        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((result) => (
              <li key={result.id} className="search-result-item">
                <button
                  onClick={() => handleAddFriend(result._id)}
                  className="add-friend-button"
                >
                  Add {result.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>Friend Requests</h3>
        {friendRequests.length > 0 ? (
          <ul className="friend-requests-list">
            {friendRequests.map((request) => (
              <li key={request.id} className="friend-request-item">
                {request.name} wants to be your friend.{" "}
                <button
                  onClick={() => handleAcceptRequest(request.id)}
                  className="accept-button"
                >
                  Accept
                </button>{" "}
                <button
                  onClick={() => handleRejectRequest(request.id)}
                  className="reject-button"
                >
                  Reject
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No friend requests found.</p>
        )}
      </div>
      {
        //error && <p>{error}</p>
      }
    </div>
  );
};

export default HomePage;
