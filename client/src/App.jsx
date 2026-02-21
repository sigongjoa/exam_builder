import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
// Placeholder components for now
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import ProblemBank from './pages/ProblemBank';
import AIGenerate from './pages/AIGenerate';
import ProblemEditor from './pages/ProblemEditor';
import ExamBuilder from './pages/ExamBuilder';
import ExamCreate from './pages/ExamCreate';
import AIHubExplorer from './pages/AIHubExplorer';
import ConceptTagger from './pages/ConceptTagger';
import ConceptGraph from './pages/ConceptGraph';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<StudentList />} />
          <Route path="problems" element={<ProblemBank />} />
          <Route path="generate" element={<AIGenerate />} />
          <Route path="editor/:id" element={<ProblemEditor />} />
          <Route path="exams" element={<ExamBuilder />} />
          <Route path="exams/new" element={<ExamCreate />} />
          <Route path="aihub" element={<AIHubExplorer />} />
          <Route path="concept-tagging" element={<ConceptTagger />} />
          <Route path="concept-graph" element={<ConceptGraph />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
