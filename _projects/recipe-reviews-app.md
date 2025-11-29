---
layout: page
title: Recipe Reviews & User Feedback Analysis
description: Analyze recipe reviews and user feedback using Neo4j graph database
img: assets/img/recipe-reviews-app/app_screenshot.png
importance: 2
category: data-engineering
related_publications: false
mermaid:
  enabled: true
  zoomable: true
---

This project demonstrates the power of graph databases, specifically **Neo4J**, to uncover complex relationships within user data. Unlike relational databases which require expensive JOIN operations to traverse many-to-many relationships, graph databases treat relationships as first-class citizens (edges), allowing for O(1) traversal speed for user-interaction queries.

For this project, I utilized the [Recipe Reviews and User Feedback](https://archive.ics.uci.edu/dataset/911/recipe+reviews+and+user+feedback+dataset) dataset from the UCI Machine Learning Repository. By modeling the network of users and their comments on various recipes, we can
- Analyze behavioral patterns based on shared recipes
- Understand how users are linked through their interactions with specific recipes

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/app_screenshot.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot" %}

&nbsp;

### [App](https://neo4jrecipereviews-uibtwgcvjfohpkugn7xxxr.streamlit.app/){:target="\_blank"}

### [GitHub](https://github.com/cyshen11/neo4j_recipe_reviews){:target="\_blank"}

&nbsp;

## Tech Stack

- Frontend: Streamlit
- Backend: Neo4j
- Cloud: Streamlit Community Cloud, Neo4J Aura

&nbsp;
&nbsp;

## Architecture

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/architecture.drawio.png" class="img-fluid rounded z-depth-1" alt="Architecture" %}

&nbsp;
&nbsp;

## Step 1: Preparing datasets

I downloaded the Recipe Reviews and User Feedback dataset from [Recipe Reviews and User Feedback](https://archive.ics.uci.edu/dataset/911/recipe+reviews+and+user+feedback+dataset) dataset from the UCI Machine Learning Repository. The dataset consists of these fields.


{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/dataset_preview.png" class="img-fluid rounded z-depth-1" alt="Dataset Preview" %}

I split the dataset into 3 files, recipe.csv, comment.csv and user.csv. Each file represents an entity. Recipe.csv contains recipe_number, recipe_code and recipe_name fields. Comment.csv contains comment_id, recipe_code, user_id, created_at, reply_count, thumbs_up, thumbs_down, stars, best_score, and text fields.

The dataset splitting script is available in the [repository](https://github.com/cyshen11/neo4j_recipe_reviews/blob/main/jupyter_nb/preprocess_data.ipynb)

&nbsp;
&nbsp;

# Step 2: Setting up local Neo4j database instance and ingesting data

I downloaded the Neo4j Desktop to run the database instance locally and ingested the 3 csv files using the console. I defined the relationships (e.g. mapping `Recipe` to `Comment` nodes) at the page shown below. The ingestion script is [linked here](https://github.com/cyshen11/neo4j_recipe_reviews/blob/main/cypher/ingest_csv.cypher).

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/neo4j_ingest.png" class="img-fluid rounded z-depth-1" alt="Ingest data using Neo4j desktop" %}

&nbsp;
&nbsp;

# Step 3: Brainstorming analysis questions with LLM

I passed the data schema to Gemini to brainstorm some possible analysis question that would be interesting to solve with graph database. Below is the prompt I used to generate these questions.

```
Please refer below for the graph data model. What kind of analytics question can be easily solved by graph database but not relational database? 

- Nodes 
    - COMMENT
        - created_at: time at which the comment was posted as unix timestamp 
        - reply_count: number of replies to the comment
        - thumbs_up: number of up-votes the comment has received
        - thumbs_down: number of down-votes the comment has received 
        - stars: the score on a 1 to 5 scale that the user gave to the recipe. A score of 0 means that no score was given
        - best_score: score of the comment, likely used by the site the help determine the order the comments appear in
        - text: the text content of the comment	
    - RECIPE
        - recipe_number: placement of the recipe on the top 100 recipes list
        - recipe_name: name of the recipe the comment was posted on
    - USER
        - user_name: name of the user
        - user_reputation: internal score of the site, roughly roughly quantifying the past behaviour of the user

- Relationships
    - USER - [POSTED] -> COMMENT
    - COMMENT - [BELONGS_TO] -> RECIPE
```

These are the questions I eventually used.

```
# Analytic Question

<!-- Generated with Gemini 2.5 Flash -->

1. Influential Commenter Analysis: What is the reach of a high-reputation user's comments? Find all users who have commented on the same recipes as the top 10 highest-reputation users. This can help identify which users are part of a key network.

2. Recipe Similarity Based on Users: What recipes are most similar to each other based on commenter overlap? For any given recipe, identify the top 5 other recipes that have the highest number of shared commenters. This could power a "users also commented on..." recommendation feature.

3. User-Recipe Commenting Paths: What are the most common paths a user takes when commenting on recipes? For example, do users who comment on baking recipes tend to also comment on a specific type of dessert recipe? This uncovers user behavior patterns.

4. "Tribe" Identification: Find clusters of users who have commented on a unique and highly similar set of recipes. This could be used to identify communities or "tribes" of users with shared interests, even if they don't directly interact. (This advanced feature was explored locally but excluded from the cloud deployment due to GDS library constraints)

5. Chain of Influence: Trace the user_reputation or thumbs_up scores through the network. For a specific high-reputation user, what is the average thumbs_up count of the comments on the recipes they have also commented on? This measures their indirect influence on a recipe's overall engagement.

6. Outlier Detection: Identify users who comment on a diverse range of recipes that have little to no commenter overlap with one another. This could point to users with eclectic tastes or those who are not part of any specific community. (Could not find user who fits this criteria)

7. Community Bridging: Find users who have commented on recipes from two or more distinct user "tribes." These "bridge" users are critical for connecting different parts of the community and could be influential.

8. Recipe Journey: Visualize the commenting journey of a new user. What are the first 5 recipes they comment on, and do those recipes share any common commenters or are they part of the same category?

9. Impact of High-Rated Comments: How does a 5-star comment from a high-reputation user affect subsequent commenting activity on a recipe? For a given recipe, what is the total reply_count and thumbs_up on comments posted after a 5-star comment from a high-reputation user?

10. Reputation Flow: How does user_reputation correlate across the network? What is the average user_reputation of all users who have commented on the same recipes as the top 10 most reputable users?
```

&nbsp;
&nbsp;

# Step 4: Developing app and writing Cypher queries

There are 6 main functionalities for this application:
- Influential Commenter Analysis: Analyze the reach of high-reputation user's comments
- Recipe Similarity: Discover recipes that attract a similar audience
- User Recipe Commenting Paths: Map the typical journey a user takes when commenting on recipes
- Chain of Influence: Measures high-reputation user's indirect influence on recipe's overall engagement
- Recipe Journey: Commenting journey of a new user
- Impact of High Rated Comments: Measure how does a 5-star comment from a high-reputation user affect subsequent commenting activity on a recipe

The Streamlit code can be found at [here](https://github.com/cyshen11/neo4j_recipe_reviews/tree/main/app/pages) while the cypher scripts can be found at [here](https://github.com/cyshen11/neo4j_recipe_reviews/tree/main/app/cypher).

**Influential Commenter Analysis**

Influential Commenter Analysis shows the user with highest reputation and the users reached by them depending on the number of the same recipes they have commented on. It also shows the average reputation of users reached.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/influential_commenter.png" class="img-fluid rounded z-depth-1" alt="Influential Commenter Page Screenshot" %}

**Recipe Similarity**

Recipe Similarity shows the recipes that are similar to the selected recipe based on the commenters overlap. It also show the shared commenters.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/recipe_similarity.png" class="img-fluid rounded z-depth-1" alt="Recipe Similarity Page Screenshot" %}

**User Recipe Commenting Paths**

User Recipe Commenting Paths shows what are the other recipes user have commented before or after the selected recipes.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/user_recipe_commenting_paths.png" class="img-fluid rounded z-depth-1" alt="User Recipe Commenting Paths Page Screenshot" %}

**Chain of Influence**

Chain of Influence shows for a selected user, what's their reputation, average thumbs-up count of the comments on the recipes they have also commented on and the comments.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/chain_of_influence.png" class="img-fluid rounded z-depth-1" alt="Chain of Influence Page Screenshot" %}

**Recipe Journey**

Recipe Journey shows the first 3 recipes that new user have commented on.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/recipe_journey.png" class="img-fluid rounded z-depth-1" alt="Recipe Journey Page Screenshot" %}

**Impact of High-Rated Comments**

Impact of High-Rated Comments shows for the selected recipe, what's the first 5-star comment from a high-reputation user, total reply count and total thumbs-up after the first 5-star comment. High reputation users refers to the top 100 users with the highest reputation.

{% include figure.liquid loading="eager" path="assets/img/recipe-reviews-app/impact_of_high_rated_comments.png" class="img-fluid rounded z-depth-1" alt="Impact of High-Rated Comments Page Screenshot" %}

&nbsp;
&nbsp;

# Step 5: Setting up Neo4j cloud instance

Now that I have tested everything working locally. It is time to deploy to cloud. I am using the Neo4j aura free tier to setup the cloud instance. I exported the Neo4j local instance as dump and imported it into the Neo4j cloud instance. I updated the Streamlit secrets to connect to the cloud instance.

&nbsp;
&nbsp;

# Step 6: Deploying app

I deployed the app to Streamlit Community Cloud through Github.

&nbsp;
&nbsp;

## Afterthoughts

Developing this application highlighted the trade-offs between local development and cloud free-tiers. A significant challenge was the **Tribe Identification** algorithm (Question 4). While I successfully implemented this locally using the Neo4j Graph Data Science (GDS) library, I was unable to deploy it to the production app because the Neo4j Aura Free Tier does not support the GDS plugin.

**Lessons Learned**

- Cypher Complexity: Transitioning from SQL to Cypher required a shift in mental mode, particularly for variable-length path queries (e.g., determining influence chains)
- Cloud Constraints: Future projects will require a budget for Aura Professional to enable advanced graph algorithms like Louvain or PageRank

## References

Dataset

- UCI Machine Learning Repository, [Recipe Reviews and User Feedback](https://archive.ics.uci.edu/dataset/911/recipe+reviews+and+user+feedback+dataset) 
