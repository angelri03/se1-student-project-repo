// Note: create a file with the same name for testing purposes lol
// feel free to modify the dummy data for testing or add more
// sorry for the self insert, i lack creativity so i picked my own projects LMFAO :D

export const dummyProject = {
  title: "AI Assistant for CS Students",
  description: "This project introduces an AI-powered note-taking tool designed to help computer science students learn faster and study more effectively. The app enhances the user's notes using generative AI. It summarizes material, expands brief points, explains complex technical concepts, and automatically generates flashcards. Built with an LLM and Retrieval-Augmented Generation (RAG) pipeline, sentence embeddings, and the OpenAI API, it delivers accurate, context-aware assistance tailored to CS coursework. Whether you're reviewing lectures, learning algorithms, or preparing for exams, the AI Assistant makes understanding and organizing information easier than ever.",
  course: "Introduction to Generative AI",
  topic: ["Web Development"],
  authors: ["Angelica", "Robert"],
  fileName: "genai-project.zip",
  fileSize: "92.9 MB",
  rating: 4.5,
  totalRatings: 23
}

export const dummyProjects = [
  {
    id: 1,
    title: "AI Assistant for CS Students",
    description: "This project introduces an AI-powered note-taking tool designed to help computer science students learn faster and study more effectively. The app enhances the user's notes using generative AI. It summarizes material, expands brief points, explains complex technical concepts, and automatically generates flashcards. Built with an LLM and Retrieval-Augmented Generation (RAG) pipeline, sentence embeddings, and the OpenAI API, it delivers accurate, context-aware assistance tailored to CS coursework. Whether you're reviewing lectures, learning algorithms, or preparing for exams, the AI Assistant makes understanding and organizing information easier than ever.",
    course: "Introduction to Generative AI",
    topic: ["Web Development", "NLP", "RAG"],
    authors: ["Angelica", "Robert"],
    uploadDate: "2025-12-10",
    fileName: "genai-project.zip",
    rating: 4.5,
    totalRatings: 23
  },
  {
    id: 2,
    title: "Interactive Human-in-the-Loop Storytelling",
    description: "This project introduces an application for collaborative storytelling, where users and a Large Language Model (LLM) co-create narratives in an interactive environment. It combines a notepad-style application with a chat interface and a character builder, allowing users to seamlessly develop stories and characters. The system dynamically adapts to user input, utilizing Retrieval-Augmented Generation (RAG) to suggest contextually relevant story elements. With interactive feedback mechanisms, users can refine suggestions and explore creative possibilities, enhancing their storytelling experience.",
    course: "Natural Language Processing",
    topic: ["Natural Language Processing", "RAG", "LLM"],
    authors: ["Angelica", "Robert"],
    uploadDate: "2024-12-19",
    fileName: "interactive-storytelling.zip",
    rating: 4.8,
    totalRatings: 17
  },
  {
    id: 3,
    title: "Parental Controls for AI",
    description: "This project aims to enhance parental control tools for children's use of Generative AI in education, addressing risks such as plagiarism, misinformation, inappropriate content, and over-reliance on AI. It introduces a foundational system with customizable content filtering, secure reveal options, and daily usage-time limits to give parents greater oversight. The project ultimately seeks to create a safer, more guided GenAI experience for young learners while preserving the educational benefits of these technologies.",
    course: "AI4Edu",
    topic: ["Web Development", "AI Safety"],
    authors: ["Angelica", "Robert", "Abdeljalil"],
    uploadDate: "2025-05-08",
    fileName: "parentalcontrols4ai.zip",
    rating: 4.3,
    totalRatings: 31
  },
  {
    id: 4,
    title: "AI Art Detector",
    description: "This project focuses on image classification using Convolutional Neural Networks to distinguish between AI-generated and humans made art. Users can upload images to the web application, and the trained model will predict whether the image falls into the category of AI-generated art, or human made art.",
    course: "Bachelor Semester Project",
    topic: ["Deep Learning", "Computer Vision"],
    authors: ["Angelica"],
    uploadDate: "2023-12-07",
    fileName: "ai-art-detector.zip",
    rating: 4.6,
    totalRatings: 12
  }
]
