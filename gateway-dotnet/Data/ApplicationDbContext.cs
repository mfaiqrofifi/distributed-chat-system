using gateway_dotnet.Entities;
using Microsoft.EntityFrameworkCore;

namespace gateway_dotnet.Data;

public sealed class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(user => user.Id);

            entity.Property(user => user.OAuthProvider)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(user => user.OAuthSubject)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(user => user.Email)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(user => user.Name)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(user => user.AvatarUrl)
                .HasMaxLength(500);

            entity.Property(user => user.CreatedAt)
                .IsRequired();

            entity.HasIndex(user => new { user.OAuthProvider, user.OAuthSubject })
                .IsUnique();

            entity.HasIndex(user => user.Email)
                .IsUnique();
        });
    }
}
