// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-projects",
          title: "projects",
          description: "A growing collection of my cool projects.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "My GitHub profile and repositories.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "projects-kafka-chess-app",
          title: 'Kafka Chess App',
          description: "Building a web-based chess game with real-time analytics",
          section: "Projects",handler: () => {
              window.location.href = "/projects/kafka-chess-app/";
            },},{id: "projects-loan-prediction-app",
          title: 'Loan Prediction App',
          description: "Building a simple loan prediction web app",
          section: "Projects",handler: () => {
              window.location.href = "/projects/loan-prediction-app/";
            },},{id: "projects-recipe-reviews-amp-user-feedback-analysis",
          title: 'Recipe Reviews &amp;amp; User Feedback Analysis',
          description: "Analyze recipe reviews and user feedback using Neo4j graph database",
          section: "Projects",handler: () => {
              window.location.href = "/projects/recipe-reviews-app/";
            },},{id: "projects-sharepoint-rag-app",
          title: 'SharePoint RAG App',
          description: "Building a simple SharePoint RAG app",
          section: "Projects",handler: () => {
              window.location.href = "/projects/sharepoint-rag-app/";
            },},{id: "projects-sql-database-rag-app",
          title: 'SQL Database RAG App',
          description: "Building a simple SQL database RAG app",
          section: "Projects",handler: () => {
              window.location.href = "/projects/sql-rag-app/";
            },},{id: "projects-supply-chain-web-app",
          title: 'Supply Chain Web App',
          description: "Building a simple supply chain web app",
          section: "Projects",handler: () => {
              window.location.href = "/projects/supply-chain-web-app/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%76%69%6E%63%65%6E%74.%63%68%65%6E%67%79%75%6E%73%68%65%6E%67@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/yun-sheng-cheng-86094a143", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
