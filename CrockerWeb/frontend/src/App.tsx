import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import KidsHome from './screens/KidsHome'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<KidsHome />} />
      </Routes>
    </Router>
  )
}

export default App
