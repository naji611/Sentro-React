import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import "./ChatPage.css";

import messageSentSound from "./sent.mp3";
import messageRecevedSound from "./receved.mp3";

import socket from "./socket";
const messageSentAudio = new Audio(messageSentSound);
const messageRecevedAudio = new Audio(messageRecevedSound);

const ChatPage = ({ user }) => {
  const { friendId } = useParams();

  const [unreadMessages, setUnreadMessages] = useState({});
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentFriendName, setCurrentFriendName] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState(null); // New state to keep track of the selected friend ID
  const messageContainerRef = useRef(null);

  useEffect(() => {
    setSelectedFriendId(friendId); // Update selectedFriendId when friendId changes
  }, [friendId]);

  useEffect(() => {
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
          setFriends(data.friends.map((friend) => ({ ...friend })));
        } else {
          setError(data.message);
        }
      } catch (error) {
        setError("An error occurred. Please try again.");
      }

      socket.off("new-message");
      socket.on("new-message", (newMessage) => {
        console.log(newMessage);
        setFriends((prevFriends) =>
          prevFriends.map((friend) =>
            friend.id === newMessage.senderId
              ? { ...friend, notifications: friend.notifications + 1 }
              : friend
          )
        );
        messageRecevedAudio.play();
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });

      socket.on("user-typing", (data) => {
        // Check if the receiver is the current user
        if (data.senderId === friendId) {
          setIsTyping(data.typing);
        }
      });
    };

    fetchFriends();

    return () => {
      socket.off("new-message");
      socket.off("user-typing");
    };
  }, [user, friendId]);

  useEffect(() => {
    socket.on("user-offline", (data) => {
      console.log(data);
      setFriends((prevFriends) =>
        prevFriends.map((friend) =>
          friend._id === data.userId ? { ...friend, isOnline: false } : friend
        )
      );
    });
    socket.emit("user-connected", { userId: user.id, isOnline: true });

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:3001/getConversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            friendId,
            userId: user.id,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setMessages(data.messages);

          const currentFriend = friends.find(
            (friend) => friend.id === friendId
          );
          console.log(currentFriend);
          currentFriend.notifications = data.notifications;
          if (currentFriend) {
            setCurrentFriendName(currentFriend.name);
            console.log(currentFriend.name);
          }
        } else {
          setError(data.message);
        }
      } catch (error) {
        setError("An error occurred. Please try again.");
      }
    };

    fetchMessages();
  }, [user, friendId, friends]);

  const handleTyping = (typing) => {
    socket.emit("typing", { typing, receiverId: friendId, senderId: user.id });
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    try {
      messageSentAudio.play();
      socket.emit("sent-message", {
        message: messageInput,
        date: new Date().toISOString(),
        senderId: user.id,
        receiverId: friendId,
      });

      const newMessage = {
        content: messageInput,
        senderId: user.id,
        createdAt: new Date().toISOString(),
      };

      setMessages([...messages, newMessage]);
      setMessageInput("");
      setError(null);
      scrollToBottom();
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "" : date.toLocaleString();
  };

  return (
    <div className="chat-container">
      <div className="friends-list-panel">
        <h3>Friends List</h3>
        <ul className="friends-list">
          {friends.map((friend) => (
            <li key={friend.id}>
              <Link to={`/chat/${friend.id}`}>
                {friend.name}

                {friend.notifications > 0 && ( // Render notification indicator if there are unread messages
                  <span className="notification">{friend.notifications}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-content">
        <h2>Chat with {currentFriendName}</h2>
        {isTyping &&
          selectedFriendId === friendId && ( // Only show typing indicator if the selected friend is the one typing
            <p>{currentFriendName} is typing...</p>
          )}

        <div className="message-container" ref={messageContainerRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${
                message.senderId === user.id ? "sent" : "received"
              }`}
            >
              <p className="message-content">{message.content}</p>
              <div className="message-details">
                <span className="sender-name">
                  {message.senderId === user.id ? "you" : currentFriendName}
                </span>
                <span className="message-date">
                  {formatDate(message.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="input-container">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => {
            setMessageInput(e.target.value);
            handleTyping(true);
          }}
          onBlur={() => handleTyping(false)}
          className="message-input"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          disabled={messageInput.trim() === ""}
          className="send-button"
        >
          Send
        </button>
      </div>
      <Link to="/" className="home-button">
        Go to Home
      </Link>
    </div>
  );
};

export default ChatPage;
