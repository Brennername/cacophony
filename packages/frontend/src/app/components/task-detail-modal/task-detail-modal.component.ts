import requests
import json

def get_github_repo_contributors(owner, repo):
    """
    Retrieves a list of contributors for a GitHub repository.

    Args:
        owner (str): The owner of the repository.
        repo (str): The name of the repository.

    Returns:
        list: A list of contributor usernames, or None if an error occurred.
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        contributors = response.json()
        usernames = [contributor['login'] for contributor in contributors]
        return usernames
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return None

if __name__ == '__main__':
    owner = "tensorflow"
    repo = "tensorflow"
    contributors = get_github_repo_contributors(owner, repo)

    if contributors:
        print(f"Contributors for {owner}/{repo}:")
        for contributor in contributors:
            print(contributor)