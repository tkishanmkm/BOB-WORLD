// src/components/settings/chat-settings.tsx
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus } from 'lucide-react';
// import { useChatSettings } from '@/context/chat-settings-context'; // Keep if needed for other settings (remove if no other settings exist)

const ChatSettings: React.FC = () => {
  // const { settings, setSettings } = useChatSettings(); // Uncomment if needed for other settings

  const [chats, setChats] = useState([
    {
      id: 1,
      messages: [
        { type: 'user', text: 'Hello', date: '2023-10-27', time: '10:00 AM' },
        { type: 'agent', text: 'Hi there!', date: '2023-10-27', time: '10:01 AM' },
      ],
    },
  ]);

  const [newChat, setNewChat] = useState({
    sender: '',
    content: '',
    date: '',
    time: '',
  });

  // Placeholder functions for managing chats
  const handleAddChat = () => {
    if (newChat.sender && newChat.content && newChat.date && newChat.time) {
      const newChatId = chats.length > 0 ? chats[chats.length - 1].id + 1 : 1;
      const updatedChats = [...chats, { id: newChatId, messages: [{ type: newChat.sender, text: newChat.content, date: newChat.date, time: newChat.time }] }];
      setChats(updatedChats);
      setNewChat({ sender: '', content: '', date: '', time: '' }); // Clear input fields
    } else {
      alert('Please fill in all fields for the new chat.');
    }
  };


  const handleEditChat = (chatId: number) => {
    console.log(`Editing chat ${chatId}`);
    // Add logic to edit chat
  };

  // Remove these toggles
  // const handleToggleEditing = (checked: boolean) => {
  //   setSettings((prevSettings) => ({
  //     ...prevSettings,
  //     allowEditing: checked,
  //   }));
  // };

  const handleDeleteChat = (chatId: number) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
  };

 return (
 <div className="p-4 space-y-4">

 <h2 className="text-lg font-semibold">Chat Settings</h2>

 {/* Manage Chats Section */}
 <Card>
 <CardHeader>
 <CardTitle>Manage Chats</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {chats.map((chat) => (
 <div key={chat.id} className="border p-4 rounded-md">
 <div className="flex justify-between items-center mb-2">
 <h3 className="font-medium">Chat {chat.id}</h3>
 <div className="flex space-x-2">
 <Button variant="outline" size="sm" onClick={() => handleEditChat(chat.id)}>
 <Pencil className="h-4 w-4" />
 </Button>
 <Button variant="outline" size="sm" onClick={() => handleDeleteChat(chat.id)}>
 <Trash2 className="h-4 w-4 text-red-500" />
 </Button>
 </div>
 </div>
 <div className="text-sm text-gray-600">
 {chat.messages.map((message, index) => (
 <div key={index}>
 <strong>{message.type === 'user' ? 'You' : 'Agent'}:</strong> {message.text}
 <span className="ml-2 text-xs">({message.date} {message.time})</span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 <div className="mt-4">
 <Button onClick={handleAddChat}>
 <Plus className="h-4 w-4 mr-2" /> Add New Chat
 </Button>
 </div>
 </CardContent>
 </Card>
 {/* End Manage Chats Section */}

 </div>
 );
};
export default ChatSettings;
