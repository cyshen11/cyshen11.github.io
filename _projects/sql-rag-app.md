---
layout: page
title: SQL Database RAG App
description: Building a simple SQL database RAG app
img: assets/img/sql-rag-app/app_screenshot.png
importance: 1
category: llm
related_publications: false
---

I wanted to learn how to use LLMs to query data from SQL databases, so I decided to build a web app and deploy it on the cloud. Here's how I did it.

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/app_screenshot.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot" %}

&nbsp;

### [App](https://sql-chatbot-vincent-cheng.streamlit.app/){:target="\_blank"}

### [GitHub](https://github.com/cyshen11/finance-chatbot/tree/main-sql-chatbot){:target="\_blank"}

### [Demo](https://youtu.be/bHhlXm2JrlE){:target="\_blank"}

&nbsp;

## Tech Stack

- Frontend: Streamlit
- Database: SQLite
- Cloud: Streamlit community cloud
- LLM: OpenAI’s gpt-4o-mini
- Tools: LangChain

&nbsp;

The technology stack was carefully selected to balance functionality, ease of development, and cost efficiency. Streamlit was chosen as the frontend framework due to its rapid prototyping capabilities and Python-native development environment, making it ideal for data science applications. SQLite serves as the SQL database, aligning with the project's core objective of building an SQL database query system. The application is hosted on Streamlit Community Cloud, providing a cost-effective deployment solution with built-in CD capabilities. For the language models, OpenAI's GPT is chosen for its proven performance and extensive documentation. The entire application is orchestrated using LangChain, which provides a comprehensive framework for building RAG applications while abstracting away much of the complexity in connecting various components.

&nbsp;
&nbsp;

## Architecture

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/architecture.webp" class="img-fluid rounded z-depth-1" alt="Architecture" %}

&nbsp;
&nbsp;

## Step 1: Setting up SQLite for Database

I started by creating the database component in [database.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/database.py){:target="\_blank"} to create SQLite database on-disk.

There are 5 functions in this component, `create_tables`, `insert_ticker_data`, `create_database`, `test_database` and `check_db_exist`.

- `create_tables`: Creates companies, price_history, balance_sheets, income_statements tables with pre-defined schema
- `insert_ticker_data`: Inserts the past five years of data (company info, price history, balance sheet, and income statement) from Yahoo Finance via the `yfinance` library.
- `create_database`: Calls `create_tables` and `insert_ticker_data` functions with symbol parameter values such as AAPL, NVDA and GOOG
- `test_database`: Queries sample data from the tables for data validation
- `check_db_exist`: Calls `create_database` function. This function is called at the [Home page](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/pages/home.py)
  {:target="\_blank"}

&nbsp;

## Step 2: Generating SQL query

I developed the writer component in [writer.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/writer.py){:target="\_blank"} to generate SQL query.

There are 2 functions, `init_llm` and `write_query`. There is 1 class `QueryOutput`.

- `init_llm`: Initializes LLM Open AI instance with gpt-4o-mini model
- `write_query`: Generates SQL query
- `QueryOutput`: Specifies the output required from the LLM

For `write_query`, this function will

1. Receive the `state` for the graph
2. Pull prompt template from Langchain hub
3. Connect to SQLite database in read-only mode to prevent unwanted modification to the database
4. Update prompt with the database dialect, top _k_ results, table info and user's question
5. Specify output required from LLM
6. Invoke LLM with the updated prompt
7. Return generated SQL query

&nbsp;

## Step 3: Executing SQL query

I developed the executor component in [executor.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/executor.py){:target="\_blank"} to execute SQL query.

There is only 1 function, `execute_query`. This function will

1. Connect to SQLite database in read-only mode to prevent unwanted modification to the database
2. Execute SQL query
3. Return query result

&nbsp;

## Step 4: Generating answers

I developed the generator component in [generator.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/generator.py){:target="\_blank"} to generate an answer based on the query result in response to the user's question.

There is only 1 function, `generate_answer`. This function will

1. Initialize LLM OpenAI instance with gpt-4o-mini model
2. Create prompt
3. Invoke LLM with the updated prompt
4. Return generated answer

&nbsp;

## Step 5: Creating RAG

I referred to this [LangChain documentation](https://python.langchain.com/docs/tutorials/sql_qa/#human-in-the-loop){:target="\_blank"} Human-in-the-loop section to develop the graph component in [graph.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/graph.py){:target="\_blank"} to orchestrate the `writer`, `executor` and `generator` components. Below diagram shows the flow for the RAG whereby it will be interrupted before executing the query. It will continue executing the query once received input from the user.

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/rag_flow.png" class="img-fluid rounded z-depth-1 w-25" alt="RAG Flow" %}
(From [LangChain documentation](https://python.langchain.com/docs/tutorials/sql_qa/#human-in-the-loop){:target="\_blank"})

There is 1 class, `Chatbot` with 6 methods, `build_graph`, `run_graph`, `continue_graph`, `update_query`, `string_tuples_to_markdown_table` and `extract_sql_headers`. This class is initialized with a Langgraph graph and config to specify the thread ID for continuing the run after user inputs.

- `build_graph`: Compiles RAG graph
- `run_graph`: Runs the RAG graph and returns the generated query
- `continue_graph`: Continues running the graph after receiving user inputs and returns the query result, generated answer
- `update_query`: Updates the graph state with the updated query
- `string_tuples_to_markdown_table`: Converts query result from tuples format to markdown format for displaying in the app
- `extract_sql_headers`: Extracts the column headers from the SQL query

For `build_graph`, I compiled the graph with checkpointer so that it can be continued later. I specified the graph to be interrupted before the `execute_query` step to wait for user inputs.

```python
graph = graph_builder.compile(
    checkpointer=memory,
    interrupt_before=["execute_query"]
)
```

For `run_graph`, I stream the graph by providing user's question as the input.

```python
for step in self.graph.stream(
    {"question": question},
    self.config,
    stream_mode="updates",
):
```

However, for `continue_graph`, the graph is streamed without providing any input as it is not required.

```python
for step in self.graph.stream(
    None,
    self.config,
    stream_mode="updates",
):
```

For `update_query`, I updated the graph state with the query to the `write_query` node.

```python
self.graph.update_state(self.config, {"query": query}, as_node="write_query")
```

Besides the `graph` component, I also developed the RAG state in [utils.py](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/components/utils.py){:target="\_blank"}. The RAG state class is used by the RAG to keep track of its state. It is a class and has 4 attributes.

- `question`: User's question
- `query`: SQL query
- `result`: Query result
- `answer`: Generated answer

## Step 6: Creating user interface

The chatbot interface component is located [here](https://github.com/cyshen11/finance-chatbot/blob/main-sql-chatbot/pages/home.py){:target="\_blank"} based on [Streamlit Documentation](https://docs.streamlit.io/develop/tutorials/llms/build-conversational-apps){:target="\_blank"}.

Firstly, the app will check if the SQLite database exist. If it is not, it will create the database by calling `check_db_exist` function. It will also get the OpenAI API key from the environment which provided by the user in the sidebar input.

```python
openai_api_key = os.environ["OPENAI_API_KEY"]
```

There are 2 functions, `update_session_state` and `write_chat_message`. `update_session_state` is used to save user input to the chat history and in the session state. `write_chat_message` is used to output message in the chat interface for the provided role and save in the chat history.

This page will initialize the `ChatBot` instance when it is first loaded and output startup message. It will also set the session `verification_status` (variable to capture user input) as _New_ and `sql_query` as blank.

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/app_screenshot.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot" %}

This page will continuously display the chat history throughout the session.

```python
for message in st.session_state.chat_history:
    with st.chat_message(message["role"]):
        st.write(message["content"])
```

When user submitted question in the chat interface and the session `verification_status` is _New_, the `ChatBot` will run the RAG with the user's question. It will then respond with the generated SQL query and 2 buttons, `Run query` and `Modify`.

```python
if prompt := st.chat_input("Ask a question about the database"):
    # User ask new query
    if st.session_state.verification_status == "New":
        write_chat_message("user", prompt)
        response = st.session_state.chatbot.run_graph(prompt)

        if response:
            write_chat_message("assistant", response)

            # Create buttons
            col1, col2 = st.columns(2)
            col1.button("Run query", key="approve_btn", on_click=update_session_state, args=['Run query'])
            col2.button("Modify", key="modify_btn", on_click=update_session_state, args=['Modify query'])
```

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/generate_query.png" class="img-fluid rounded z-depth-1" alt="Generate SQL Query" %}

If user clicked `Run query`, the app will update the session `verification_status` to _Run query_ and the `ChatBot` will continue running to execute the query and generate the answer.

```python
# User clicked run query
if st.session_state.verification_status == "Run query":
    response = st.session_state.chatbot.continue_graph()
    if response:
        write_chat_message("assistant", response)
        st.session_state.verification_status = "New"
```

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/run_query.png" class="img-fluid rounded z-depth-1" alt="Run Query" %}

If user clicked `Modify`, the app will update the session `verification_status` to _Modify query_ and `Chatbot` will ask user to provide modified query.

```python
# User clicked modify query
if st.session_state.verification_status == "Modify query":
    response = "Please provide modified query."
    write_chat_message("assistant", response)
```

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/modify_query.png" class="img-fluid rounded z-depth-1" alt="Modify Query" %}

If user submitted valid query, the `ChatBot` will continue to execute with the new query and generate the answer. If there is error in executing the query, the app will update the session `verification_status` to _Query invalid_.

```python
# User provided query
elif st.session_state.verification_status == "Modify query" or st.session_state.verification_status == "Query invalid":
    write_chat_message("user", "`" + prompt + "`")
    st.session_state.chatbot.update_query(prompt)

    try:
        response = st.session_state.chatbot.continue_graph()
        if response:
            write_chat_message("assistant", response)
        st.session_state.verification_status = "New"
    except:
        st.session_state.verification_status = "Query invalid"
```

If the session `verification_status` is _Query invalid_, the `ChatBot` will ask the user to submit query that is SQLite3 dialect.

```python
# Query provided by user is invalid
if st.session_state.verification_status == "Query invalid":
    response = "Query is not supported. Please write query that is SQLite3 dialect."
    write_chat_message("assistant", response)
```

{% include figure.liquid loading="eager" path="assets/img/sql-rag-app/query_invalid.png" class="img-fluid rounded z-depth-1" alt="Invalid Query" %}

## Step 7: Deploying to Streamlit Community Cloud

Lastly, I deployed the app to Streamlit Community Cloud from my GitHub for free hosting. I configured the repo, branch, main file path, python version (3.10) and the Streamlit secrets.

{% include figure.liquid loading="eager" path="assets/img/sharepoint-rag-app/deploy.png" class="img-fluid rounded z-depth-1" alt="Deploy to Streamlit" %}

## Afterthoughts

**The Risk of Autonomous SQL Execution** Building a "Text-to-SQL" system revealed a critical safety challenge: LLMs can hallucinate destructive queries (e.g., `DROP TABLE`) or syntactically incorrect SQL. To mitigate this, I implemented two layers of defense:
1. **Architecutre**: A Human-in-the-loop (HITL) workflow using **LangGraph checkpoints**, requiring user approval before any SQL is executed.
2. **Infrastructure**: Enforcing **Read-Only** database connections at the driver level to prevent data corruption.

**LangGraph for State Management** Unlike a standard RAG application, a SQL agent requires complex state management (tracking the generated query, user modifications, and execution results). **LangGraph** provided superior to linear chains here, allowing me to treat the "Modify Query" step as a cyclic node in the graph state, effectively enabling a conversation with the database. 

**Future Enhancements**

- Adding a Schema Explorer sidebar so users can see available columns (e.g., `NVDA`, `High`, `Volume`) before asking questions
- Find actual use case for this project

## References

- LangChain, [Build a Question/Answering system over SQL data](https://python.langchain.com/docs/tutorials/sql_qa/#human-in-the-loop){:target="\_blank"}
- LangChain, [How to view and update past graph state](https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/time-travel/#interacting-with-the-agent){:target="\_blank"}
