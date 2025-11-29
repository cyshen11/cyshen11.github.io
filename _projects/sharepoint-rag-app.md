---
layout: page
title: SharePoint RAG App
description: Building a simple SharePoint RAG app
img: assets/img/sharepoint-rag-app/app_screenshot.png
importance: 1
category: llm
related_publications: false
---

I wanted to learn more about using LLM to query documents from SharePoint, so I decided to build a web app and deploy it on the cloud. Here's how I did it.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/app_screenshot.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot" %}

&nbsp;

### [App](https://finance-chatbot-vincent-cheng.streamlit.app/){:target="\_blank"}

### [GitHub](https://github.com/cyshen11/finance-chatbot){:target="\_blank"}

### [Demo](https://youtu.be/ezz6eNPCTYM){:target="\_blank"}

&nbsp;

## Tech Stack

- Frontend: Streamlit
- Database: ChromaDB
- Storage: Microsoft SharePoint
- Cloud: Streamlit community cloud
- LLM: OpenAI’s gpt-4o-mini, Google’s Gemini 1.5 Flash-8B
- Text Embeddings: OpenAI’s text-embedding-3-large, Google’s embedding-001
- Tools: LangChain

The technology stack was carefully selected to balance functionality, ease of development, and cost efficiency. Streamlit was chosen as the frontend framework due to its rapid prototyping capabilities and Python-native development environment, making it ideal for data science applications. For vector storage, ChromaDB was selected for its seamless integration with LangChain and robust vector search capabilities. Microsoft SharePoint serves as the document storage solution, aligning with the project's core objective of building an enterprise document query system. The application is hosted on Streamlit Community Cloud, providing a cost-effective deployment solution with built-in CI/CD capabilities. For the language models, two options were implemented: OpenAI's GPT, chosen for its proven performance and extensive documentation, and Google's Gemini, selected for its competitive performance and free API access during development. The entire application is orchestrated using LangChain, which provides a comprehensive framework for building RAG applications while abstracting away much of the complexity in connecting various components.

&nbsp;
&nbsp;

## Architecture

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/architecture.png" class="img-fluid rounded z-depth-1" alt="Architecture" %}

&nbsp;
&nbsp;

## Step 1: Setting up SharePoint for Document Storage

I started by signing up for SharePoint (Plan 1) and provisioning my SharePoint instance. Then, I uploaded Alphabet, Apple and NVIDA financial reports to the SharePoint folder.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/sharepoint.png" class="img-fluid rounded z-depth-1" alt="SharePoint Screenshot" %}

## Step 2: Indexing PDF documents

Indexing documents is the process of converting the documents into vector embeddings and storing them in a vector database. Vector databases enable similarity searches (such as cosine similarity) to find relevant documents.

**Creating document loader component**

I developed the document loader component [here](https://github.com/cyshen11/finance-chatbot/blob/main/components/document_loader.py){:target="\_blank"} to load the PDF documents in SharePoint.

This component requires 3 parameters `O365_CLIENT_ID`, `O365_CLIENT_SECRET`, `O365_TOKEN`. I followed this [documentation](https://python.langchain.com/docs/integrations/document_loaders/microsoft_sharepoint/){:target="\_blank"} on how to get these parameters values. For the `O365_TOKEN`, I converted the content in `o365_token.txt` into TOML format. I copied the content in TOML format and pasted into Streamlit secrets in the format as shown below.

```
[O365_TOKEN]
token_type = ...
scope = ...
expires_in = ...
...
```

There are 2 functions in this component, `init_sharepoint_loader` and `load_documents`.

- `init_sharepoint_loader` function is used to initialize SharePointLoader class
- `load_documents` is used to load the documents from SharePoint

`init_sharepoint_loader` function requires 2 parameters `DOCUMENT_LIBRARY_ID` and `FOLDER_ID` which I got it from this [documentation](https://python.langchain.com/docs/integrations/document_loaders/microsoft_sharepoint/){:target="\_blank"}. This function also read the `O365_TOKEN` in Streamlit secrets, convert it to JSON and save the JSON at this directory `Path.home() / ".credentials"`. This JSON will be used as token to initialize the SharePointLoader.

Please ensure that `o365_token.txt` and the `.credentials` folder are added to your `.gitignore` file to prevent accidental leakage of sensitive tokens.

```python
directory_path = Path.home() / ".credentials"

# Check if dir exist
if not os.path.exists(directory_path):
  os.makedirs(directory_path)

# Write O365 token into text file
with open(directory_path / "o365_token.txt", 'w') as f:
  json.dump(O365_TOKEN, f)

# Initialize document loader
loader = SharePointLoader(
  document_library_id=document_library_id,
  auth_with_token=True,
  folder_id=folder_id
)
```

**Creating vector store component**

Next, I developed the vector store component [here](https://github.com/cyshen11/finance-chatbot/blob/main/components/vector_store.py){:target="\_blank"} to create the vector database.

There are 6 functions in this component, `initialize_vector_store`, `add_items`, `retrieve`, `create_vector_store`, `get_collection_name`, and `check_vector_store_exist`.

- `initialize_vector_store` is used to initialize Chroma database instance with specified collection, embeddings and directory
- `add_items` is used to add documents into the vector database
- `retrieve` is used to retrieve top _k_ documents that are relevant to the question from the vector database
- `create_vector_store` is used to load the documents from SharePoint using document loader component from the previous step and add them using `add_items` function to the vector database
- `get_collection_name` is used to specify the collection name based on user selected model
- `check_vector_store_exist` is used to check if ChromaDB exist on disk. If it is not, this function will call `create_vector_store`

**Implementation**

I added `check_vector_store_exist` function at the [Home page](https://github.com/cyshen11/finance-chatbot/blob/main/pages/home.py){:target="\_blank"} to create the vector database if it doesn't exist.

## Step 3: Retrieving documents

Retrieving documents is the process of retrieving top _k_ relevant documents based on user question.

**Implementation**

I implemented this step at the `retrieve` function of vector store component.

## Step 4: Generating answers

Generating answers is the process of sending the LLM relevant documents to generate response to user's question.

**Creating generator component**

There is only 1 function in this [component](https://github.com/cyshen11/finance-chatbot/blob/main/components/generator.py){:target="\_blank"}, `generate`. This component will

1. Initialize the LLM based on user selected model.
2. Pull the prompt template from Langchain.
3. Post-processing retrieved documents to remove duplicate.
4. Generate the prompt with user's question and retrieved documents as context.
5. Invoke the LLM with the generated prompt.
6. Return the answer and the retrieved documents as source.

## Step 5: Creating RAG

I utilized **LangGraph** to orchestrate the retrieval and generation state. While a linear chain would suffice for this MVP, LangGraph provides the infrastructure to easily add cyclic loops (e.g. query rewriting or self-correction) in future iterations.

**Creating graph component**

There is only 1 function in this [component](https://github.com/cyshen11/finance-chatbot/blob/main/components/graph.py){:target="\_blank"}, `generate`. This component will initialize the RAG with the sequence of retrieve then generate.

## Step 6: Creating user interface

There are 3 pages, `Home`, `Index Docs`, and `About`. `Home` is the main page where user interacts. `Index Docs` is the page where user can manually index the documents. `About` is the documentation page. I added the `Model` dropdown at the sidebar. If users choose Google Gemini model, they will be using my API key as it is free for now. However, if they choose OpenAI model, they will have to provide their own API key.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/openai_model.png" class="img-fluid rounded z-depth-1" alt="User Select OpenAI Model" %}

At the [Home](https://github.com/cyshen11/finance-chatbot/blob/main/pages/home.py){:target="\_blank"} page, I added the code to build the graph and check vector database exist before loading the remaining user interface components.

```python
graph = build_graph()
check_vector_store_exist()
```

Then, I added the SharePoint folder link and a text box for user to ask the question. Upon clicking `Submit`, the app will return the answer and source.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/sharepoint_rag_result.png" class="img-fluid rounded z-depth-1" alt="User Interface Screenshot" %}

At the [Index](https://github.com/cyshen11/finance-chatbot/blob/main/pages/index_docs.py){:target="\_blank"} page, I added the button to index the SharePoint documents based on selected model.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/index_page.png" class="img-fluid rounded z-depth-1" alt="Index Page" %}

At the [About](https://github.com/cyshen11/finance-chatbot/blob/main/pages/about.py){:target="\_blank"} page, I added the documentation for this project.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/about_page.png" class="img-fluid rounded z-depth-1" alt="About Page" %}

## Step 7: Deploying to Streamlit Community Cloud

Lastly, I deployed the app to Streamlit Community Cloud from my GitHub for free hosting. I configured the repo, branch, main file path, python version (3.10) and the Streamlit secrets.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/deploy.png" class="img-fluid rounded z-depth-1" alt="Deploy to Streamlit" %}

## Afterthoughts

Developing an enterprise-facing RAG application requires careful consideration of the entire data pipeline, particularly the choice of vector store and orchestration framework. This one-week sprint provided key insights into the operational challenges of building on a cloud-based stack.

**Vector Store Evaluation: MongoBD vs. ChromaDB**

Initial development explored using **MongoDB Atlas Vector Search** due to its scalability potential and unified data platform. However, performance testing revealed integration friction. Integrating MongoDB with the chosen orchestration framework, **LangChain/LangGraph**, required more complex custom wrappers compared to other native options. This led to a pivot to **ChromaDB**. The decision was based on its **seamless, native integration with LangChain**, offering a faster iteration cycle and significantly improved local I/O performance. For an MVP, ChromaDB proved to be the more reliable, low-friction solution.

**Orchestration and Architecture**

The decision to use **LangGraph** was strategic. While the current flow is a simple linear chain (Retrieve -> Generate), selecting LangGraph establishes a future-proof architecture. It provides the necessary infrastructure (State Graph) to easily implement complex, agentic behaviors in future enhancements, such as:
- Self-Correction Loops: Allowing the LLM to rewrite a poor query and re-search the documents.
- Tool Calling: Integrating other enterprise tools (e.g., Calendar APIs) into the RAG flow.

**Security and Deployment Best Practices**

Successfully deploying the application to the Streamlit Community Cloud enforced critical lessons in security and environment management:
- Credential Management: The need to securely handle the Microsoft 365 token via the `Path.home() / ".credentials"` directory emphasized the importance of rigorous `.gitignore` practices to prevent credential leakage.

**Lessons Learned**

- Choosing a vector database is a trade-off between **deployment complexity** (MongoDB) and **development velocity/local performance** (ChromaDB).
- **LangGraph** is the optimal choice for RAG systems where future complexity or agentic behavior is anticipated.
- Robust **credential mangement** must be prioritized when dealing with enterprise data sources like SharePoint.

**Future Enhancements**

- Implement advanced search algorithms to improve document retrieval accuracy.
- Improve UI/UX to display available SharePoint documents to the user
- Parse the SharePoint URL to display a clean filename (e.g.,` 2024q3-alphabet.pdf`) instead of the full raw link.

## References

- LangChain, [Document loaders, Microsoft SharePoint](https://python.langchain.com/docs/integrations/document_loaders/microsoft_sharepoint/){:target="\_blank"}
