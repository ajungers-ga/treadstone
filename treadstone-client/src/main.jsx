import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import HomePage from './pages/HomePage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import EventDetailPage from './pages/EventDetailPage.jsx'
import PlayersPage from './pages/PlayersPage.jsx'
import PlayerDetailPage from './pages/PlayerDetailPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:id', element: <PlayerDetailPage /> },
      { path: 'leaderboard/:eventId', element: <LeaderboardPage /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
