"""
Canonical Skills Taxonomy, Aliases, and Boundary-Safe Normalizer.
Complies with Sections 19, 20, and 21 of the Master Build Specification.
"""

from typing import Dict, List, Optional, Tuple, Set
import re

# Master taxonomy of canonical skills mapped to category
CANONICAL_SKILLS: Dict[str, Dict[str, str]] = {
    # 1. Programming Languages
    "Python": {"category": "Programming Languages", "description": "High-level, interpreted general-purpose programming language."},
    "JavaScript": {"category": "Programming Languages", "description": "High-level, just-in-time compiled language conforming to ECMAScript standard."},
    "TypeScript": {"category": "Programming Languages", "description": "Strict syntactical superset of JavaScript adding static typing."},
    "Java": {"category": "Programming Languages", "description": "Class-based, object-oriented programming language designed for portability."},
    "C++": {"category": "Programming Languages", "description": "General-purpose programming language with low-level memory manipulation."},
    "C": {"category": "Programming Languages", "description": "Procedural computer programming language supporting structured programming."},
    "Go": {"category": "Programming Languages", "description": "Statically typed, compiled high-concurrency language designed at Google."},
    "Rust": {"category": "Programming Languages", "description": "Systems programming language focused on safety, speed, and concurrency."},
    "SQL": {"category": "Programming Languages", "description": "Standard language for storing, manipulating and retrieving data in databases."},
    "HTML/CSS": {"category": "Programming Languages", "description": "Standard markup and styling languages for web document presentation."},
    
    # 2. Frontend
    "React": {"category": "Frontend", "description": "Declarative component-based frontend library for user interfaces."},
    "Next.js": {"category": "Frontend", "description": "React framework for server-rendered and static web applications."},
    "Vue.js": {"category": "Frontend", "description": "Progressive model-view-viewmodel JavaScript framework for UIs."},
    "Angular": {"category": "Frontend", "description": "TypeScript-based open-source web application framework by Google."},
    "Tailwind CSS": {"category": "Frontend", "description": "Utility-first CSS framework for rapid modern UI development."},
    "Redux": {"category": "Frontend", "description": "Predictable state container for JavaScript applications."},

    # 3. Backend & APIs
    "FastAPI": {"category": "Backend", "description": "Modern, high-performance web framework for building APIs with Python."},
    "Node.js": {"category": "Backend", "description": "Asynchronous event-driven JavaScript runtime environment."},
    "Express": {"category": "Backend", "description": "Minimal and flexible Node.js web application framework."},
    "Django": {"category": "Backend", "description": "High-level Python web framework encouraging rapid, secure development."},
    "Flask": {"category": "Backend", "description": "Micro web framework written in Python."},
    "Spring Boot": {"category": "Backend", "description": "Open source Java-based framework used to create microservices."},
    "REST APIs": {"category": "Backend", "description": "Architectural style for distributed hypermedia systems."},
    "GraphQL": {"category": "Backend", "description": "Query language for APIs and runtime for fulfilling queries with data."},
    "gRPC": {"category": "Backend", "description": "High-performance, open source universal RPC framework."},

    # 4. Databases & Storage
    "PostgreSQL": {"category": "Databases", "description": "Powerful, open source object-relational database system."},
    "MySQL": {"category": "Databases", "description": "Open-source relational database management system."},
    "MongoDB": {"category": "Databases", "description": "Source-available, cross-platform document-oriented database."},
    "Redis": {"category": "Databases", "description": "In-memory data structure store used as database, cache, and message broker."},
    "SQLite": {"category": "Databases", "description": "C-language library that implements a small, fast, self-contained SQL database."},

    # 5. Cloud & DevOps
    "AWS": {"category": "Cloud & DevOps", "description": "Amazon Web Services comprehensive cloud computing platform."},
    "Azure": {"category": "Cloud & DevOps", "description": "Microsoft cloud computing platform and services."},
    "GCP": {"category": "Cloud & DevOps", "description": "Google Cloud Platform suite of cloud computing services."},
    "Docker": {"category": "Cloud & DevOps", "description": "Platform as a service product for developing, shipping, and running applications in containers."},
    "Kubernetes": {"category": "Cloud & DevOps", "description": "Open-source system for automating deployment, scaling, and management of containerized applications."},
    "CI/CD": {"category": "Cloud & DevOps", "description": "Continuous Integration and Continuous Deployment/Delivery automation pipelines."},
    "Git": {"category": "Cloud & DevOps", "description": "Distributed version control system for tracking changes in source code."},
    "Linux": {"category": "Cloud & DevOps", "description": "Open-source Unix-like operating system kernel and tools."},

    # 6. AI/ML & Data
    "Machine Learning": {"category": "AI/ML & Data", "description": "Study of computer algorithms that improve automatically through experience."},
    "Deep Learning": {"category": "AI/ML & Data", "description": "Subset of machine learning based on artificial neural networks with representation learning."},
    "PyTorch": {"category": "AI/ML & Data", "description": "Optimized tensor library for deep learning using GPUs and CPUs."},
    "TensorFlow": {"category": "AI/ML & Data", "description": "End-to-end open source platform for machine learning."},
    "Scikit-Learn": {"category": "AI/ML & Data", "description": "Simple and efficient tools for predictive data analysis in Python."},
    "Pandas": {"category": "AI/ML & Data", "description": "Fast, powerful, flexible open source data analysis and manipulation tool."},
    "NumPy": {"category": "AI/ML & Data", "description": "Fundamental package for scientific computing with Python."},
    "Computer Vision": {"category": "AI/ML & Data", "description": "Field of AI that trains computers to interpret and understand the visual world."},
    "Natural Language Processing": {"category": "AI/ML & Data", "description": "Subfield of computer science dealing with the interactions between computers and human language."},

    # 7. Core Computer Science & Architecture
    "Data Structures & Algorithms": {"category": "Core Computer Science", "description": "Foundational computer science study of data organization, management, and problem solving."},
    "Object-Oriented Programming": {"category": "Core Computer Science", "description": "Programming paradigm based on the concept of objects containing data and code."},
    "DBMS": {"category": "Core Computer Science", "description": "Database Management Systems core principles, normalization, ACID properties, and transactions."},
    "Operating Systems": {"category": "Core Computer Science", "description": "Fundamental concepts of process management, memory allocation, concurrency, and file systems."},
    "Computer Networks": {"category": "Core Computer Science", "description": "Architecture and protocols for data exchange (TCP/IP, UDP, OSI model, DNS, HTTP)."},
    "System Design": {"category": "Core Computer Science", "description": "Process of defining the architecture, modules, interfaces, and data for a system to satisfy requirements."},
}

# Aliases dictionary: Maps raw or colloquial terms to the Canonical Skill name
# All alias keys are lowercase for case-insensitive normalization
SKILL_ALIASES: Dict[str, str] = {
    # Programming Languages
    "python": "Python",
    "python3": "Python",
    "py": "Python",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "ecmascript": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "java": "Java",
    "c++": "C++",
    "cpp": "C++",
    "c plus plus": "C++",
    "golang": "Go",
    "rustlang": "Rust",
    "rust": "Rust",
    "sql": "SQL",
    "html": "HTML/CSS",
    "css": "HTML/CSS",
    "html5": "HTML/CSS",
    "css3": "HTML/CSS",
    "html/css": "HTML/CSS",

    # Frontend
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "Angular",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "redux": "Redux",
    "redux-toolkit": "Redux",

    # Backend
    "fastapi": "FastAPI",
    "fast-api": "FastAPI",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "express": "Express",
    "expressjs": "Express",
    "express.js": "Express",
    "django": "Django",
    "flask": "Flask",
    "spring": "Spring Boot",
    "springboot": "Spring Boot",
    "spring boot": "Spring Boot",
    "rest": "REST APIs",
    "restful": "REST APIs",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful apis": "REST APIs",
    "graphql": "GraphQL",
    "grpc": "gRPC",

    # Databases
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "psql": "PostgreSQL",
    "mysql": "MySQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "sqlite": "SQLite",
    "sqlite3": "SQLite",

    # Cloud & DevOps
    "aws": "AWS",
    "amazon web services": "AWS",
    "azure": "Azure",
    "microsoft azure": "Azure",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "docker": "Docker",
    "containerization": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "cicd": "CI/CD",
    "ci/cd": "CI/CD",
    "github actions": "CI/CD",
    "git": "Git",
    "github": "Git",
    "gitlab": "Git",
    "linux": "Linux",
    "bash": "Linux",
    "unix": "Linux",
    "shell scripting": "Linux",

    # AI/ML & Data
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning",
    "dl": "Deep Learning",
    "neural networks": "Deep Learning",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "tf": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "computer vision": "Computer Vision",
    "cv": "Computer Vision",
    "nlp": "Natural Language Processing",
    "natural language processing": "Natural Language Processing",

    # Core CS
    "dsa": "Data Structures & Algorithms",
    "data structures": "Data Structures & Algorithms",
    "algorithms": "Data Structures & Algorithms",
    "data structures & algorithms": "Data Structures & Algorithms",
    "data structures and algorithms": "Data Structures & Algorithms",
    "oop": "Object-Oriented Programming",
    "oops": "Object-Oriented Programming",
    "object oriented programming": "Object-Oriented Programming",
    "dbms": "DBMS",
    "database management system": "DBMS",
    "database management systems": "DBMS",
    "relational database design": "DBMS",
    "operating systems": "Operating Systems",
    "os concepts": "Operating Systems",
    "computer networks": "Computer Networks",
    "networking": "Computer Networks",
    "tcp/ip": "Computer Networks",
    "system design": "System Design",
    "high level design": "System Design",
    "low level design": "System Design",
}

# Special single-token keywords that require strict boundary and context checking
SPECIAL_BOUNDARIES: Dict[str, str] = {
    r"\bc\+\+\b": "C++",
    r"\bcpp\b": "C++",
    r"\b(c\s*programming|\blanguage\s*:\s*c\b|\bc\s*,\s*c\+\+|\bc\s*and\s*c\+\+)\b": "C",
    r"\b(golang|go\s*programming|built\s*in\s*go|backend\s*in\s*go)\b": "Go",
}

def resolve_skill_alias(raw_term: str) -> Optional[str]:
    """Resolves a raw skill term or phrase to its canonical name."""
    clean = raw_term.strip().lower()
    return SKILL_ALIASES.get(clean)

def canonicalize_skill(raw_term: str) -> str:
    """Convenience alias to resolve raw skill term or return raw if not in taxonomy."""
    resolved = resolve_skill_alias(raw_term)
    return resolved if resolved else raw_term.strip()

def get_skill_category(canonical_name: str) -> str:
    """Returns category of a canonical skill."""
    if canonical_name in CANONICAL_SKILLS:
        return CANONICAL_SKILLS[canonical_name]["category"]
    return "Technical"

def extract_canonical_skills_from_text(text: str) -> List[Tuple[str, str]]:
    """
    Extracts canonical skills from a block of text using boundary-safe regex matching.
    Returns a list of tuples: (canonical_name, matched_token).
    Prevents false matches (e.g., 'Java' won't match inside 'JavaScript').
    """
    found_skills: Dict[str, str] = {}
    normalized_lower = " " + text.lower() + " "

    # 1. Match special boundaries first (C++, C, Go)
    for pattern, canonical in SPECIAL_BOUNDARIES.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            found_skills[canonical] = match.group(0)

    # 2. Match multi-word aliases first (e.g. 'machine learning', 'data structures and algorithms')
    # Sort aliases by length descending so longer phrases get prioritized
    sorted_aliases = sorted(SKILL_ALIASES.keys(), key=lambda x: len(x), reverse=True)
    
    for alias in sorted_aliases:
        canonical = SKILL_ALIASES[alias]
        if canonical in found_skills:
            continue
        
        # Don't match short single-letter or easily confused abbreviations without strict word boundaries
        if len(alias) <= 2 and alias not in ["js", "ts", "py", "ml", "dl", "cv", "os", "cn"]:
            continue

        # Use regex word boundaries for accurate matching
        escaped_alias = re.escape(alias)
        pattern = rf"(?<![\w\-]){escaped_alias}(?![\w\-])"
        
        match = re.search(pattern, normalized_lower)
        if match:
            # Special check: prevent "Java" matching "JavaScript"
            if alias == "java" and re.search(r"javascript", normalized_lower):
                # Only count Java if there's a standalone occurrence of java NOT followed by script
                java_standalone = re.search(r"(?<![\w\-])java(?!script|[\w\-])", normalized_lower)
                if not java_standalone:
                    continue
            
            found_skills[canonical] = alias

    return [(canonical, token) for canonical, token in found_skills.items()]
